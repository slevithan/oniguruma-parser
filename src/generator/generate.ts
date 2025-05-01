import type {GroupNode, Node, OnigurumaAst, ParentNode, QuantifierNode, RegexNode} from '../parser/parse.js';
import type {FlagProperties} from '../tokenizer/tokenize.js';
import {r, throwIfNullish} from '../utils.js';

type OnigurumaRegex = {
  pattern: string;
  flags: string;
};

/**
Generates an Oniguruma `pattern` and `flags` from an `OnigurumaAst`.
*/
function generate(ast: OnigurumaAst): OnigurumaRegex {
  const parentStack: Array<ParentNode> = [];
  let lastNode: Node = ast;
  const state: State = {
    inCharClass: false,
    lastNode,
    parent: ast,
  };
  const gen: Gen = node => {
    state.lastNode = lastNode;
    lastNode = node; // For the next iteration
    if (getFirstChild(state.lastNode) === node) {
      state.parent = state.lastNode as ParentNode;
      parentStack.push(state.parent);
    }
    const fn = throwIfNullish(generator[node.type], `Unexpected node type "${node.type}"`);
    // @ts-expect-error
    const result = fn(node, state, gen);
    if (getLastChild(state.parent) === node) {
      parentStack.pop();
      state.parent = parentStack.at(-1) ?? ast;
    };
    return result;
  };
  return {
    pattern: ast.body.map(gen).join('|'),
    // Could reset `lastNode` at this point via `lastNode = ast`, but it isn't needed by flags
    flags: gen(ast.flags),
  };
}

type State = {
  inCharClass: boolean;
  lastNode: Node;
  parent: ParentNode;
};

type NonRootNode = Exclude<Node, RegexNode>;

type Gen = (node: NonRootNode) => string;

type Generator = {
  [N in NonRootNode as N['type']]:
  (node: N, state: State, gen: Gen) => string
};

const generator: Generator = {
  AbsenceFunction({body, kind}, _, gen) {
    if (kind !== 'repeater') {
      throw new Error(`Unexpected absence function kind "${kind}"`);
    }
    return `(?~${body.map(gen).join('|')})`;
  },

  Alternative({body}, _, gen) {
    return body.map(gen).join('');
  },

  Assertion({kind, negate}) {
    if (kind === 'text_segment_boundary') {
      return negate ? r`\Y` : r`\y`;
    }
    if (kind === 'word_boundary') {
      return negate ? r`\B` : r`\b`;
    }
    return throwIfNullish({
      line_end: '$',
      line_start: '^',
      search_start: r`\G`,
      string_end: r`\z`,
      string_end_newline: r`\Z`,
      string_start: r`\A`,
    }[kind], `Unexpected assertion kind "${kind}"`);
  },

  Backreference({ref}) {
    if (typeof ref === 'number') {
      // TODO: Won't be safe to indiscriminately unenclose when forward backrefs are supported
      return '\\' + ref;
    }
    // Onig doesn't allow chars `>` or `'` in backref names, so this is safe
    return `\\k<${ref}>`;
  },

  CapturingGroup({body, name}, _, gen) {
    const enclosedName = name ? `?${name.includes('>') ? `'${name}'` : `<${name}>`}` : '';
    return `(${enclosedName}${body.map(gen).join('|')})`;
  },

  Character(node, {inCharClass, lastNode, parent}) {
    const {value} = node;
    if (CharCodeEscapeMap.has(value)) {
      return CharCodeEscapeMap.get(value)!;
    }
    const escDigit = lastNode.type === 'Backreference';
    if (
      // Control chars, etc.; condition modeled on the Chrome developer console's display for strings
      value < 32 || (value > 126 && value < 160) ||
      // Unicode planes 4-16; unassigned, special purpose, and private use area
      value > 0x3FFFF ||
      // Avoid corrupting a preceding backref by immediately following it with a literal digit
      (escDigit && isDigitCharCode(value))
    ) {
      // Onig treats unenclosed `\x80` to `\xFF` as an encoded byte (a fragment of a code unit), so
      // we can't use them to represent a character. Also, don't convert value `0` to `\0` since
      // that's corruptible by following literal digits
      return value > 0x7F ?
        `\\x{${value.toString(16).toUpperCase()}}` :
        `\\x${value.toString(16).toUpperCase().padStart(2, '0')}`;
    }
    const char = String.fromCodePoint(value);
    let escape = false;
    if (inCharClass) {
      const isDirectClassKid = parent.type === 'CharacterClass';
      const isFirst = isDirectClassKid && parent.body[0] === node;
      const isLast = isDirectClassKid && parent.body.at(-1) === node;
      // Avoid escaping in some optional special cases when escaping isn't needed due to position
      if (char === '^') {
        escape = isFirst && !parent.negate;
      } else if (char === ']') {
        escape = !isFirst;
      } else if (char === '-') {
        // Could also avoid escaping if it's immediately after a range or nested class, but don't
        // make that the default rendering
        escape = !isFirst && !isLast;
      } else {
        escape = CharClassEscapeChars.has(char);
      }
    } else {
      escape = BaseEscapeChars.has(char);
    }
    return `${escape ? '\\' : ''}${char}`;
  },

  CharacterClass({body, kind, negate}, state, gen) {
    function genClass() {
      if (
        state.parent.type === 'CharacterClass' &&
        state.parent.kind === 'intersection' &&
        kind === 'union' &&
        !body.length
      ) {
        // Prevent empty intersection like `[&&]` from becoming the invalid `[[]&&[]]`
        return '';
      }
      return `[${negate ? '^' : ''}${
        body.map(gen).join(kind === 'intersection' ? '&&' : '')
      }]`;
    }
    if (!state.inCharClass) {
      // For the outermost char class, set state
      state.inCharClass = true;
      const result = genClass();
      state.inCharClass = false;
      return result;
    }
    return genClass();
  },

  CharacterClassRange({min, max}, _, gen) {
    return `${gen(min)}-${gen(max)}`;
  },

  CharacterSet({kind, negate, value}, {inCharClass}) {
    switch (kind) {
      case 'any':
        return r`\O`;
      case 'digit':
        return negate ? r`\D` : r`\d`;
      case 'dot':
        return '.';
      case 'hex':
        return negate ? r`\H` : r`\h`;
      case 'newline':
        return negate ? r`\N` : r`\R`;
      case 'posix':
        return inCharClass ?
          `[:${negate ? '^' : ''}${value}:]` :
          `${negate ? r`\P` : r`\p`}{${value}}`;
      case 'property':
        return `${negate ? r`\P` : r`\p`}{${value}}`;
      case 'space':
        return negate ? r`\S` : r`\s`;
      case 'text_segment':
        return r`\X`;
      case 'word':
        return negate ? r`\W` : r`\w`;
      default:
        throw new Error(`Unexpected character set kind "${kind}"`);
    }
  },

  Directive({kind, flags}) {
    if (kind === 'flags') {
      const {enable = {}, disable = {}} = flags;
      const enableStr = getFlagsStr(enable);
      const disableStr = getFlagsStr(disable);
      return (enableStr || disableStr) ? `(?${enableStr}${disableStr ? `-${disableStr}` : ''})` : '';
    }
    if (kind === 'keep') {
      return r`\K`;
    }
    throw new Error(`Unexpected directive kind "${kind}"`);
  },

  Flags(node) {
    return getFlagsStr(node);
  },

  Group({atomic, body, flags}, _, gen) {
    const contents = body.map(gen).join('|');
    return `(?${getGroupPrefix(atomic, flags)}${contents})`;
  },

  LookaroundAssertion({body, kind, negate}, _, gen) {
    const prefix = `${kind === 'lookahead' ? '' : '<'}${negate ? '!' : '='}`;
    return `(?${prefix}${body.map(gen).join('|')})`;
  },

  NamedCallout({kind, tag, arguments: args}) {
    if (kind === 'custom') {
      // TODO: If supporting custom callout names in the future (with an added `name` property for
      // `NamedCalloutNode`), will need to use `name` instead of `kind` if `kind` is `'custom'`
      throw new Error(`Unexpected named callout kind "${kind}"`);
    }
    return `(*${kind.toUpperCase()}${tag ? `[${tag}]` : ''}${args ? `{${args.join(',')}}` : ''})`;
  },

  Quantifier(node, {parent}, gen) {
    // Rendering Onig quantifiers is wildly, unnecessarily complex compared to other regex flavors
    // because of the combination of a few features unique to Onig:
    // - You can create quantifier chains (i.e., quantify a quantifier).
    // - An implicit zero min is allowed for interval quantifiers (ex: `{,2}`).
    // - Interval quantifiers can't use `+` to make them possessive (it creates a quantifier
    //   chain), even though quantifiers `?` `*` `+` can.
    // - A reversed range in a quantifier makes it possessive (ex: `{2,1}`).
    //   - `{,n}` is always greedy with an implicit zero min, and can't represent a possessive
    //     range from n to infinity.
    const {body, kind, max, min} = node;
    // These errors shouldn't happen unless the AST is modified in an invalid way after parsing
    if (min === Infinity) {
      throw new Error(`Invalid quantifier: infinite min`);
    }
    if (min > max) {
      throw new Error(`Invalid quantifier: min "${min}" > max "${max}"`);
    }
    const kidIsGreedyQuantifier = (
      body.type === 'Quantifier' &&
      body.kind === 'greedy'
    );
    const parentIsPossessivePlus = (
      parent.type === 'Quantifier' &&
      parent.kind === 'possessive' &&
      parent.min === 1 &&
      parent.max === Infinity
    );
    // Can't render as a symbol, because the following (parent) quantifier, which is `++`, would
    // then alter this node's meaning to make it possessive, and the parent quantifier can't change
    // to avoid this because there's no interval representation possible for `++`. There's also no
    // other way to render `*+`, but a following `*` wouldn't alter the meaning of this node. `?+`
    // is also safe since it can use the alternative `{1,0}` representation (which is possessive)
    const forcedInterval = kind === 'greedy' && parentIsPossessivePlus;
    let base;
    if (isSymbolQuantifierCandidate(node) && !forcedInterval) {
      if (
        !min && max === 1 &&
        // Can't chain a base of `?` to any greedy quantifier since that would make it lazy
        !kidIsGreedyQuantifier
      ) {
        base = '?';
      } else if (!min && max === Infinity) {
        base = '*';
      } else if (
        min === 1 && max === Infinity &&
        ( // Can't chain a base of `+` to greedy `?`/`*`/`+` since that would make them possessive
          !(kidIsGreedyQuantifier && isSymbolQuantifierCandidate(body)) ||
          // ...but, we're forced to use `+` (and change the kid's rendering) if this is possessive
          // `++` since you can't use a possessive reversed range with `Infinity`
          kind === 'possessive'
        )
      ) {
        base = '+';
      }
    }
    const isIntervalQuantifier = !base;
    if (isIntervalQuantifier) {
      if (kind === 'possessive') {
        if (min === max) {
          // Can't add a `+` suffix to a fixed `{n}` interval quantifier
          throw new Error(`Invalid possessive quantifier: min and max are equal "${min}"`);
        }
        if (max === Infinity) {
          // Onig reversed ranges are possessive but `{,n}` is the same as greedy `{0,n}`, so
          // there's no way to represent this without adding additional nodes that aren't in the
          // AST. The exceptions are when `min` is 0 or 1 (`?+`, `*+`, `++`), but we've already
          // ruled out rendering as a symbol at this point
          throw new Error(`Invalid possessive quantifier: min "${min}" with infinite max"`);
        }
        // Reversed range
        base = `{${max},${min}}`;
      } else if (min === max) {
        base = `{${min}}`;
      } else {
        base = `{${min},${max === Infinity ? '' : max}}`;
      }
    }
    const suffix = {
      greedy: '',
      lazy: '?',
      // Interval quantifiers are marked possessive by reversing their min/max; a `+` suffix would
      // create a quantifier chain
      possessive: isIntervalQuantifier ? '' : '+',
    }[kind];
    return `${gen(body)}${base}${suffix}`;
  },

  Subroutine({ref}) {
    if (typeof ref === 'string' && ref.includes('>')) {
      return r`\g'${ref}'`;
    }
    return r`\g<${ref}>`;
  },
};

// ---------------
// --- Helpers ---
// ---------------

const BaseEscapeChars = new Set([
  '$', '(', ')', '*', '+', '.', '?', '[', '\\', '^', '{', '|',
]);

const CharClassEscapeChars = new Set([
  '&', '-', '[', '\\', ']', '^',
]);

const CharCodeEscapeMap = new Map([
  [ 7, r`\a`], // bell
  [ 9, r`\t`], // horizontal tab
  [10, r`\n`], // line feed
  [11, r`\v`], // vertical tab
  [12, r`\f`], // form feed
  [13, r`\r`], // carriage return
  [27, r`\e`], // escape
  [0x2028, r`\u2028`], // line separator
  [0x2029, r`\u2029`], // paragraph separator
  [0xFEFF, r`\uFEFF`], // ZWNBSP/BOM
]);

function getFirstChild(node: Node) {
  if ('body' in node) {
    return Array.isArray(node.body) ? (node.body[0] ?? null) : node.body;
  }
  // Check for `type` to determine if it's a child node; quantifiers have a numeric `min`
  if ('min' in node && node.min.type) {
    return node.min;
  }
  return null;
}

function getLastChild(node: Node) {
  if ('body' in node) {
    return Array.isArray(node.body) ? (node.body.at(-1) ?? null) : node.body;
  }
  // Check for `type` to determine if it's a child node; quantifiers have a numeric `max`
  if ('max' in node && node.max.type) {
    return node.max;
  }
  return null;
}

function getFlagsStr({
  ignoreCase,
  dotAll,
  extended,
  digitIsAscii,
  posixIsAscii,
  spaceIsAscii,
  wordIsAscii,
  textSegmentMode,
}: Partial<FlagProperties>): string {
  return `${
    ignoreCase ? 'i' : ''
  }${
    dotAll ? 'm' : ''
  }${
    extended ? 'x' : ''
  }${
    digitIsAscii ? 'D' : ''
  }${
    posixIsAscii ? 'P' : ''
  }${
    spaceIsAscii ? 'S' : ''
  }${
    wordIsAscii ? 'W' : ''
  }${
    textSegmentMode ? throwIfNullish({
      grapheme: 'y{g}',
      word: 'y{w}',
    }[textSegmentMode], `Unexpected text segment mode "${textSegmentMode}"`) : ''
  }`;
}

function getGroupPrefix(atomic: GroupNode['atomic'], flags?: GroupNode['flags']): string {
  if (atomic) {
    return '>';
  }
  let mods = '';
  if (flags) {
    const {enable = {}, disable = {}} = flags;
    const enableStr = getFlagsStr(enable);
    const disableStr = getFlagsStr(disable);
    mods = `${enableStr}${disableStr ? `-${disableStr}` : ''}`;
  }
  return `${mods}:`;
}

function isDigitCharCode(value: number): boolean {
  return value > 47 && value < 58;
}

function isSymbolQuantifierCandidate({min, max}: QuantifierNode): boolean {
  return (
    (!min && max === 1) || // `?`
    (!min && max === Infinity) || // `*`
    (min === 1 && max === Infinity) // `+`
  );
}

export {
  type OnigurumaRegex,
  generate,
};

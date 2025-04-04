import type {AbsentFunctionNode, AlternativeNode, AssertionNode, BackreferenceNode, CapturingGroupNode, CharacterClassNode, CharacterClassRangeNode, CharacterNode, CharacterSetNode, DirectiveNode, FlagsNode, GroupNode, LookaroundAssertionNode, NamedCalloutNode, Node, OnigurumaAst, ParentNode, PatternNode, QuantifierNode, RegexNode, SubroutineNode} from '../parser/parse.js';
import type {FlagProperties} from '../tokenizer/tokenize.js';
import {cp, r, throwIfNullable} from '../utils.js';

type Gen = (node: NonRootNode) => string;
type NonRootNode = Exclude<Node, RegexNode>;
type OnigurumaRegex = {
  pattern: string;
  flags: string;
};
type State = {
  inCharClass: boolean;
  lastNode: Node;
  parent: ParentNode;
};

/**
Generates a Oniguruma `pattern` and `flags` from an `OnigurumaAst`.
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
    const fn = throwIfNullable(generator[node.type], `Unexpected node type "${node.type}"`);
    const result = fn(node, state, gen);
    if (getLastChild(state.parent) === node) {
      parentStack.pop();
      state.parent = parentStack.at(-1) ?? ast;
    };
    return result;
  };
  const pattern = gen(ast.pattern);
  lastNode = ast; // Reset
  const flags = gen(ast.flags);
  return {
    pattern,
    flags,
  };
}

const generator: {[key in NonRootNode['type']]: (node: Node, state: State, gen: Gen) => string} = {
  AbsentFunction(node: Node, _: State, gen: Gen): string {
    const {kind, alternatives} = node as AbsentFunctionNode;
    if (kind !== 'repeater') {
      throw new Error(`Unexpected absent function kind "${kind}"`);
    }
    return `(?~${alternatives.map(gen).join('|')})`;
  },

  Alternative(node: Node, _: State, gen: Gen): string {
    const {elements} = node as AlternativeNode;
    return elements.map(gen).join('');
  },

  Assertion(node: Node): string {
    const {kind, negate} = node as AssertionNode;
    if (kind === 'grapheme_boundary') {
      return negate ? r`\Y` : r`\y`;
    }
    if (kind === 'word_boundary') {
      return negate ? r`\B` : r`\b`;
    }
    return throwIfNullable({
      line_end: '$',
      line_start: '^',
      search_start: r`\G`,
      string_end: r`\z`,
      string_end_newline: r`\Z`,
      string_start: r`\A`,
    }[kind], `Unexpected assertion kind "${kind}"`);
  },

  Backreference(node: Node): string {
    const {ref} = node as BackreferenceNode;
    if (typeof ref === 'number') {
      // TODO: Won't be safe to indiscriminately unenclose when forward backrefs are supported
      return '\\' + ref;
    }
    // Onig doesn't allow chars `>` or `'` in backref names, so this is safe
    return `\\k<${ref}>`;
  },

  CapturingGroup(node: Node, _: State, gen: Gen): string {
    const {name, alternatives} = node as CapturingGroupNode;
    const enclosedName = name ? `?${name.includes('>') ? `'${name}'` : `<${name}>`}` : '';
    return `(${enclosedName}${alternatives.map(gen).join('|')})`;
  },

  Character(node: Node, {inCharClass, lastNode, parent}: State): string {
    const {value} = node as CharacterNode;
    const escDigit = lastNode.type === 'Backreference';
    if (CharCodeEscapeMap.has(value)) {
      return CharCodeEscapeMap.get(value)!;
    }
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
    const char = cp(value);
    let escape = false;
    if (inCharClass) {
      const isDirectClassKid = parent.type === 'CharacterClass';
      const isFirst = isDirectClassKid && parent.elements[0] === node;
      const isLast = isDirectClassKid && parent.elements.at(-1) === node;
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

  CharacterClass(node: Node, state: State, gen: Gen): string {
    const {kind, negate, elements} = node as CharacterClassNode;
    function genClass() {
      if (
        state.parent.type === 'CharacterClass' &&
        state.parent.kind === 'intersection' &&
        kind === 'union' &&
        !elements.length
      ) {
        // Prevent empty intersection like `[&&]` from becoming the invalid `[[]&&[]]`
        return '';
      }
      return `[${negate ? '^' : ''}${
        elements.map(gen).join(kind === 'intersection' ? '&&' : '')
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

  CharacterClassRange(node: Node, _: State, gen: Gen): string {
    const {min, max} = node as CharacterClassRangeNode;
    return `${gen(min)}-${gen(max)}`;
  },

  CharacterSet(node: Node, state: State): string {
    const {kind, negate, value} = node as CharacterSetNode;
    if (kind === 'digit') {
      return negate ? r`\D` : r`\d`;
    }
    if (kind === 'hex') {
      return negate ? r`\H` : r`\h`;
    }
    if (kind === 'newline') {
      return negate ? r`\N` : r`\R`;
    }
    if (kind === 'posix') {
      return state.inCharClass ?
        `[:${negate ? '^' : ''}${value}:]` :
        `${negate ? r`\P` : r`\p`}{${value}}`;
    }
    if (kind === 'property') {
      return `${negate ? r`\P` : r`\p`}{${value}}`;
    }
    if (kind === 'space') {
      return negate ? r`\S` : r`\s`;
    }
    if (kind === 'word') {
      return negate ? r`\W` : r`\w`;
    }
    return throwIfNullable({
      any: r`\O`,
      dot: '.',
      grapheme: r`\X`,
    }[kind], `Unexpected character set kind "${kind}"`);
  },

  Directive(node: Node): string {
    const {kind, flags} = node as DirectiveNode;
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

  Flags(node: Node): string {
    return getFlagsStr(node as FlagsNode);
  },

  Group(node: Node, _: State, gen: Gen): string {
    const {atomic, flags, alternatives} = node as GroupNode;
    const contents = alternatives.map(gen).join('|');
    return `(?${getGroupPrefix(atomic, flags)}${contents})`;
  },

  LookaroundAssertion(node: Node, _: State, gen: Gen): string {
    const {kind, negate, alternatives} = node as LookaroundAssertionNode;
    const prefix = `${kind === 'lookahead' ? '' : '<'}${negate ? '!' : '='}`;
    return `(?${prefix}${alternatives.map(gen).join('|')})`;
  },

  NamedCallout(node: Node): string {
    const {kind, /* name, */ tag, arguments: args} = node as NamedCalloutNode;
    return `(*${/* kind === 'custom' ? name ?? '' : */ kind.toUpperCase()}${tag ? `[${tag}]` : ''}${Array.isArray(args) ? `{${args.join(',')}}` : ''})`;
  },

  Pattern(node: Node, _: State, gen: Gen): string {
    const {alternatives} = node as PatternNode;
    return alternatives.map(gen).join('|');
  },

  Quantifier(node: Node, {parent}: State, gen: Gen): string {
    // Rendering Onig quantifiers is wildly, unnecessarily complex compared to other regex flavors
    // because of the combination of a few features unique to Onig:
    // - You can create quantifier chains (i.e., quantify a quantifier).
    // - An implicit zero min is allowed for interval quantifiers (ex: `{,2}`).
    // - Interval quantifiers can't use `+` to make them possessive (it creates a quantifier
    //   chain), even though quantifiers `?` `*` `+` can.
    // - A reversed range in a quantifier makes it possessive (ex: `{2,1}`).
    //   - `{,n}` is always greedy with an implicit zero min, and can't represent a possesive range
    //     from n to infinity.
    const {min, max, kind, element} = node as QuantifierNode;
    // These errors shouldn't happen unless the AST is modified in an invalid way after parsing
    if (min === Infinity) {
      throw new Error(`Invalid quantifier: infinite min`);
    }
    if (min > max) {
      throw new Error(`Invalid quantifier: min "${min}" > max "${max}"`);
    }
    const kidIsGreedyQuantifier = (
      element.type === 'Quantifier' &&
      element.kind === 'greedy'
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
    if (isSymbolQuantifierCandidate(node as QuantifierNode) && !forcedInterval) {
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
          !(kidIsGreedyQuantifier && isSymbolQuantifierCandidate(element)) ||
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
    return `${gen(element)}${base}${suffix}`;
  },

  Subroutine(node: Node): string {
    const {ref} = node as SubroutineNode;
    if (typeof ref === 'string' && ref.includes('>')) {
      return r`\g'${ref}'`;
    }
    return r`\g<${ref}>`;
  },
};

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
  if ('alternatives' in node) {
    return node.alternatives[0];
  }
  if ('elements' in node) {
    return node.elements[0] ?? null;
  }
  if ('element' in node) {
    return node.element;
  }
  if ('min' in node && 'type' in node.min) {
    return node.min;
  }
  if ('pattern' in node) {
    return node.pattern;
  }
  return null;
}

function getLastChild(node: Node) {
  if ('alternatives' in node) {
    return node.alternatives.at(-1)!; // Always at least one
  }
  if ('elements' in node) {
    return node.elements.at(-1) ?? null;
  }
  if ('element' in node) {
    return node.element;
  }
  if ('max' in node && 'type' in node.max) {
    return node.max;
  }
  if ('pattern' in node) {
    return node.pattern;
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
  generate,
  type OnigurumaRegex,
};

import {NodeAbsentFunctionKinds, NodeAssertionKinds, NodeCharacterClassKinds, NodeCharacterSetKinds, NodeDirectiveKinds, NodeLookaroundAssertionKinds, NodeQuantifierKinds, NodeTypes} from '../parser/parse.js';
import {cp, r, throwIfNot} from '../utils.js';

/**
Generates a Oniguruma `pattern` and `flags` from an `OnigurumaAst`.
@param {import('../parser/parse.js').OnigurumaAst} ast
@returns {{
  pattern: string;
  flags: string;
}}
*/
function generate(ast) {
  let lastNode = null;
  let parent = null;
  const state = {
    inCharClass: false,
    lastNode,
    parent,
  };
  function gen(node) {
    state.lastNode = lastNode;
    lastNode = node;
    if (state.lastNode && getFirstChild(state.lastNode) === node) {
      state.parent = state.lastNode;
    }
    const fn = generator[node.type];
    if (!fn) {
      throw new Error(`Unexpected node type "${node.type}"`);
    }
    return fn(node, state, gen);
  }
  return gen(ast);
}

const generator = {
  Regex({pattern, flags}, _, gen) {
    // Final result is an object; other node types return strings
    return {
      pattern: gen(pattern),
      flags: gen(flags),
    };
  },

  AbsentFunction({kind, alternatives}, _, gen) {
    if (kind !== NodeAbsentFunctionKinds.repeater) {
      throw new Error(`Unexpected absent function kind "${kind}"`);
    }
    return `(?~${alternatives.map(gen).join('|')})`;
  },

  Alternative({elements}, _, gen) {
    return elements.map(gen).join('');
  },

  Assertion({kind, negate}) {
    if (kind === NodeAssertionKinds.grapheme_boundary) {
      return negate ? r`\Y` : r`\y`;
    }
    if (kind === NodeAssertionKinds.word_boundary) {
      return negate ? r`\B` : r`\b`;
    }
    return throwIfNot({
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
      // [TODO] Won't be safe to indiscriminately unenclose when forward backrefs are supported
      return '\\' + ref;
    }
    // Onig doesn't allow chars `>` or `'` in backref names, so this is safe
    return `\\k<${ref}>`;
  },

  CapturingGroup(node, _, gen) {
    const {name, alternatives} = node;
    const nameWrapper = name ? `?${name.includes('>') ? `'${name}'` : `<${name}>`}` : '';
    return `(${nameWrapper}${alternatives.map(gen).join('|')})`;
  },

  Character({value}, state) {
    return getCharEscape(value, {
      escDigit: state.lastNode.type === NodeTypes.Backreference,
      inCharClass: state.inCharClass,
    });
  },

  CharacterClass({kind, negate, elements}, state, gen) {
    function genClass() {
      if (
        state.parent.type === NodeTypes.CharacterClass &&
        state.parent.kind === NodeCharacterClassKinds.intersection &&
        kind === NodeCharacterClassKinds.union &&
        !elements.length
      ) {
        // Prevent empty intersection like `[&&]` from becoming the invalid `[[]&&[]]`
        return '';
      }
      return `[${negate ? '^' : ''}${
        elements.map(gen).join(kind === NodeCharacterClassKinds.intersection ? '&&' : '')
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

  CharacterSet({kind, negate, value}, state) {
    if (kind === NodeCharacterSetKinds.digit) {
      return negate ? r`\D` : r`\d`;
    }
    if (kind === NodeCharacterSetKinds.hex) {
      return negate ? r`\H` : r`\h`;
    }
    if (kind === NodeCharacterSetKinds.newline) {
      return negate ? r`\N` : r`\R`;
    }
    if (kind === NodeCharacterSetKinds.posix) {
      return state.inCharClass ?
        `[:${negate ? '^' : ''}${value}:]` :
        `${negate ? r`\P` : r`\p`}{${value}}`;
    }
    if (kind === NodeCharacterSetKinds.property) {
      return `${negate ? r`\P` : r`\p`}{${value}}`;
    }
    if (kind === NodeCharacterSetKinds.space) {
      return negate ? r`\S` : r`\s`;
    }
    if (kind === NodeCharacterSetKinds.word) {
      return negate ? r`\W` : r`\w`;
    }
    return throwIfNot({
      any: r`\O`,
      dot: '.',
      grapheme: r`\X`,
    }[kind], `Unexpected character set kind "${kind}"`);
  },

  Directive({kind, flags}) {
    if (kind === NodeDirectiveKinds.flags) {
      const {enable = {}, disable = {}} = flags;
      const enableStr = getFlagsStr(enable);
      const disableStr = getFlagsStr(disable);
      return (enableStr || disableStr) ? `(?${enableStr}${disableStr ? `-${disableStr}` : ''})` : '';
    }
    if (kind === NodeDirectiveKinds.keep) {
      return r`\K`;
    }
    throw new Error(`Unexpected directive kind "${kind}"`);
  },

  Flags(node) {
    return getFlagsStr(node);
  },

  Group({atomic, flags, alternatives}, _, gen) {
    const contents = alternatives.map(gen).join('|');
    return `(?${getGroupPrefix(atomic, flags)}${contents})`;
  },

  LookaroundAssertion({kind, negate, alternatives}, _, gen) {
    const prefix = `${kind === NodeLookaroundAssertionKinds.lookahead ? '' : '<'}${negate ? '!' : '='}`;
    return `(?${prefix}${alternatives.map(gen).join('|')})`;
  },

  Pattern({alternatives}, _, gen) {
    return alternatives.map(gen).join('|');
  },

  Quantifier({min, max, kind, element}, _, gen) {
    // These errors shouldn't happen unless the AST is modified in an invalid way after parsing
    if (min > max) {
      throw new Error(`Invalid quantifier: min "${min}" > max "${max}"`);
    }
    if (min > 1 && max === Infinity && kind === NodeQuantifierKinds.possessive) {
      // Onig reversed ranges are possessive but `{,n}` is greedy `{0,n}`, so there's no way to
      // represent this without adding additional nodes that aren't in the AST
      throw new Error(`Invalid possessive quantifier: min "${min}" with no max"`);
    }
    if (min === max && kind === NodeQuantifierKinds.possessive) {
      // Can't add a `+` suffix to a fixed `{n}` interval quantifier
      throw new Error(`Invalid possessive quantifier: min and max are equal "${min}"`);
    }
    const kidIsGreedyQuantifier = element.type === NodeTypes.Quantifier && element.kind === NodeQuantifierKinds.greedy;
    let base;
    let interval = false;
    if (!min && max === 1 && !kidIsGreedyQuantifier) {
      base = '?';
    } else if (!min && max === Infinity) {
      base = '*';
    } else if (min === 1 && max === Infinity && !kidIsGreedyQuantifier) {
      base = '+';
    } else if (min === max) {
      base = `{${min}}`;
      interval = true;
    } else {
      base = kind === NodeQuantifierKinds.possessive ?
        `{${max},${min}}` :
        `{${min},${max === Infinity ? '' : max}}`;
      interval = true;
    }
    const suffix = {
      greedy: '',
      lazy: '?',
      // Interval quantifiers are marked possessive by reversing their min/max; a `+` suffix would
      // create a quantifier chain
      possessive: interval ? '' : '+',
    }[kind];
    return `${gen(element)}${base}${suffix}`;
  },

  Subroutine({ref}) {
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

function getCharEscape(codePoint, {escDigit, inCharClass}) {
  if (CharCodeEscapeMap.has(codePoint)) {
    return CharCodeEscapeMap.get(codePoint);
  }
  if (
    // Control chars, etc.; condition modeled on the Chrome developer console's display for strings
    codePoint < 32 || (codePoint > 126 && codePoint < 160) ||
    // Unicode planes 4-16; unassigned, special purpose, and private use area
    codePoint > 0x3FFFF ||
    // Avoid corrupting a preceding backref by immediately following it with a literal digit
    (escDigit && isDigitCharCode(codePoint))
  ) {
    // Don't convert codePoint `0` to `\0` since that's corruptible by following literal digits
    return codePoint > 0x7F ?
      `\\x{${codePoint.toString(16).toUpperCase()}}` :
      `\\x${codePoint.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  const escapeChars = inCharClass ? CharClassEscapeChars : BaseEscapeChars;
  const char = cp(codePoint);
  return (escapeChars.has(char) ? '\\' : '') + char;
}

function getFirstChild(node) {
  if (node.alternatives) {
    return node.alternatives[0];
  }
  if (node.elements) {
    return node.elements[0] ?? null;
  }
  if (node.element) {
    return node.element;
  }
  if (node.min && node.min.type) {
    return node.min;
  }
  if (node.pattern) {
    return node.pattern;
  }
  return null;
}

/**
@param {import('../tokenizer/tokenize.js').RegexFlags} node
@returns {string}
*/
function getFlagsStr({ignoreCase, dotAll, extended, digitIsAscii, posixIsAscii, spaceIsAscii, wordIsAscii}) {
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

/**
@param {boolean} atomic
@param {import('../parser/parse.js').FlagGroupModifiers} flagMods
@returns {string}
*/
function getGroupPrefix(atomic, flagMods) {
  if (atomic) {
    return '>';
  }
  let mods = '';
  if (flagMods) {
    const {enable = {}, disable = {}} = flagMods;
    const enableStr = getFlagsStr(enable);
    const disableStr = getFlagsStr(disable);
    mods = `${enableStr}${disableStr ? `-${disableStr}` : ''}`;
  }
  return `${mods}:`;
}

function isDigitCharCode(value) {
  return value > 47 && value < 58;
}

export {
  generate,
};

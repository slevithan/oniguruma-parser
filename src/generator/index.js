import {AstAbsentFunctionKinds, AstAssertionKinds, AstCharacterClassKinds, AstCharacterSetKinds, AstLookaroundAssertionKinds, AstTypes} from '../parser/index.js';
import {cp, r, throwIfNot} from '../utils.js';

/**
Generates a Oniguruma `pattern` and `flags` from an `OnigurumaAst`.
@param {import('../parser/index.js').OnigurumaAst} ast
@returns {{
  pattern: string;
  flags: string;
}}
*/
function generate(ast) {
  let lastNode = null;
  const state = {
    inCharClass: false,
    lastNode,
  };
  function gen(node) {
    state.lastNode = lastNode;
    lastNode = node;
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
    if (kind !== AstAbsentFunctionKinds.repeater) {
      throw new Error(`Unexpected absent function kind "${kind}"`);
    }
    return `(?~${alternatives.map(gen).join('|')})`;
  },

  Alternative({elements}, _, gen) {
    return elements.map(gen).join('');
  },

  Assertion({kind, negate}) {
    if (kind === AstAssertionKinds.grapheme_boundary) {
      return negate ? r`\Y` : r`\y`;
    }
    if (kind === AstAssertionKinds.word_boundary) {
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
      return '\\' + ref;
    }
    // Onig doesn't allow chars `>` or `'` in backref names, so this is safe
    return `\\k<${ref}>`;
  },

  CapturingGroup(node, _, gen) {
    const {name, alternatives} = node;
    const nameWrapper = name ? (name.includes('>') ? `'${name}'` : `<${name}>`) : '';
    return `(${nameWrapper}${alternatives.map(gen).join('|')})`;
  },

  Character({value}, state) {
    return getCharEscape(value, {
      escDigit: state.lastNode.type === AstTypes.Backreference,
      inCharClass: state.inCharClass,
    });
  },

  CharacterClass({kind, negate, elements}, state, gen) {
    const genClass = () => `[${negate ? '^' : ''}${
      elements.map(gen).join(kind === AstCharacterClassKinds.intersection ? '&&' : '')
    }]`;
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
    if (kind === AstCharacterSetKinds.digit) {
      return negate ? r`\D` : r`\d`;
    }
    if (kind === AstCharacterSetKinds.hex) {
      return negate ? r`\H` : r`\h`;
    }
    if (kind === AstCharacterSetKinds.newline) {
      return negate ? r`\N` : r`\R`;
    }
    if (kind === AstCharacterSetKinds.posix) {
      return state.inCharClass ? `[:${value}:]` : r`\p{${value}}`;
    }
    if (kind === AstCharacterSetKinds.property) {
      return `${negate ? r`\P` : r`\p`}{${value}}`;
    }
    if (kind === AstCharacterSetKinds.space) {
      return negate ? r`\S` : r`\s`;
    }
    if (kind === AstCharacterSetKinds.word) {
      return negate ? r`\W` : r`\w`;
    }
    return throwIfNot({
      any: r`\O`,
      dot: '.',
      grapheme: r`\X`,
    }[kind], `Unexpected character set kind "${kind}"`);
  },

  Directive({kind, flags}) {
    if (kind === 'flags') {
      const {enable, disable} = flags;
      const enableStr = getFlagsStr(enable ?? {});
      const disableStr = getFlagsStr(disable ?? {});
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

  Group({atomic, flags, alternatives}, _, gen) {
    const contents = alternatives.map(gen).join('|');
    return `(?${getGroupPrefix(atomic, flags)}${contents})`;
  },

  LookaroundAssertion({kind, negate, alternatives}, _, gen) {
    const prefix = `${kind === AstLookaroundAssertionKinds.lookahead ? '' : '<'}${negate ? '!' : '='}`;
    return `(?${prefix}${alternatives.map(gen).join('|')})`;
  },

  Pattern({alternatives}, _, gen) {
    return alternatives.map(gen).join('|');
  },

  Quantifier(node, _, gen) {
    return gen(node.element) + getQuantifierStr(node);
  },

  Subroutine({ref}) {
    if (typeof ref === 'string' && ref.includes('>')) {
      return r`\g'${ref}'`;
    }
    return r`\g<${ref}>`;
  },
};

const BaseEscapeChars = new Set([
  '$', '(', ')', '*', '+', '.', '?', '[', '\\', '^', '{', '|', '}',
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

/**
@param {import('../tokenizer/index.js').RegexFlags} node
@returns {string}
*/
function getFlagsStr({ignoreCase, dotAll, digitIsAscii, posixIsAscii, spaceIsAscii, wordIsAscii}) {
  // Leave out `extended` (flag x) since free-spacing and comments aren't included in the AST
  return `${
    ignoreCase ? 'i' : ''
  }${
    dotAll ? 'm' : ''
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
@param {import('../parser/index.js').FlagGroupModifiers} flagMods
@returns {string}
*/
function getGroupPrefix(atomic, flagMods) {
  if (atomic) {
    return '>';
  }
  let mods = '';
  if (flagMods) {
    const {enable, disable} = flagMods;
    mods = `${getFlagsStr(enable ?? {})}${disable ? '-' : ''}${getFlagsStr(disable ?? {})}`;
  }
  return `${mods}:`;
}

function getQuantifierStr({min, max, kind}) {
  let base;
  if (!min && max === 1) {
    base = '?';
  } else if (!min && max === Infinity) {
    base = '*';
  } else if (min === 1 && max === Infinity) {
    base = '+';
  } else if (min === max) {
    base = `{${min}}`;
  } else {
    base = `{${min},${max === Infinity ? '' : max}}`;
  }
  return base + {
    greedy: '',
    lazy: '?',
    possessive: '+',
  }[kind];
}

function isDigitCharCode(value) {
  return value > 47 && value < 58;
}

export {
  generate,
};

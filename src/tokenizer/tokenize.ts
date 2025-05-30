import {cpOf, PosixClassNames, r, throwIfNullish} from '../utils.js';

type Token =
  AlternatorToken |
  AssertionToken |
  BackreferenceToken |
  CharacterToken |
  CharacterClassCloseToken |
  CharacterClassHyphenToken |
  CharacterClassIntersectorToken |
  CharacterClassOpenToken |
  CharacterSetToken |
  DirectiveToken |
  GroupCloseToken |
  GroupOpenToken |
  NamedCalloutToken |
  QuantifierToken |
  SubroutineToken;

type IntermediateToken =
  EscapedNumberToken;

type TokenCharacterSetKind =
  'any' |
  'digit' |
  'dot' |
  'hex' |
  'newline' |
  'posix' |
  'property' |
  'space' |
  'text_segment' |
  'word';

type TokenDirectiveKind =
  'flags' |
  'keep';

type TokenGroupOpenKind =
  'absence_repeater' |
  'atomic' |
  'capturing' |
  'group' |
  'lookahead' |
  'lookbehind';

type TokenQuantifierKind =
  'greedy' |
  'lazy' |
  'possessive';

type TokenNamedCalloutKind =
  'count' |
  'cmp' |
  'error' |
  'fail' |
  'max' |
  'mismatch' |
  'skip' |
  'total_count' |
  'custom';

const charClassOpenPattern = r`\[\^?`;
const sharedEscapesPattern = `${
  // Control char
  'c.? | C(?:-.?)?'
}|${
  // Unicode property; Onig considers `\p` an identity escape, but e.g. `\p{`, `\p{ ^L}`, and
  // `\p{gc=L}` are invalid
  r`[pP]\{(?:\^?[-\x20_]*[A-Za-z][-\x20\w]*\})?`
}|${
  // Hex encoded byte sequence; attempt match before other `\xNN` hex char
  r`x[89A-Fa-f]\p{AHex}(?:\\x[89A-Fa-f]\p{AHex})*`
}|${
  // Hex char
  r`u(?:\p{AHex}{4})? | x\{[^\}]*\}? | x\p{AHex}{0,2}`
}|${
  // Enclosed octal code point
  r`o\{[^\}]*\}?`
}|${
  // Escaped number
  r`\d{1,3}`
}`;
// Even with flag x, Onig doesn't allow whitespace to separate a quantifier from the `?` or `+`
// that makes it lazy or possessive. Possessive suffixes don't apply to interval quantifiers
const quantifierRe = /[?*+][?+]?|\{(?:\d+(?:,\d*)?|,\d+)\}\??/;
const tokenRe = new RegExp(r`
  \\ (?:
    ${sharedEscapesPattern}
    | [gk]<[^>]*>?
    | [gk]'[^']*'?
    | .
  )
  | \( (?:
    \? (?:
      [:=!>({]
      | <[=!]
      | <[^>]*>
      | '[^']*'
      | ~\|?
      | #(?:[^)\\]|\\.?)*
      | [^:)]*[:)]
    )?
    | \*[^\)]*\)?
  )?
  | (?:${quantifierRe.source})+
  | ${charClassOpenPattern}
  | .
`.replace(/\s+/g, ''), 'gsu');
const charClassTokenRe = new RegExp(r`
  \\ (?:
    ${sharedEscapesPattern}
    | .
  )
  | \[:(?:\^?\p{Alpha}+|\^):\]
  | ${charClassOpenPattern}
  | &&
  | .
`.replace(/\s+/g, ''), 'gsu');

type Context = {
  captureGroup: boolean;
  getCurrentModX(): boolean;
  numOpenGroups: number;
  popModX(): void;
  pushModX(isXOn: boolean): void;
  replaceCurrentModX(isXOn: boolean): void;
  singleline: boolean;
};

type TokenizeOptions = {
  flags?: string;
  rules?: {
    captureGroup?: boolean;
    singleline?: boolean;
  };
};

function tokenize(pattern: string, options: TokenizeOptions = {}): {
  tokens: Array<Token>;
  flags: FlagProperties;
} {
  const opts = {
    flags: '',
    ...options,
    rules: {
      captureGroup: false, // `ONIG_OPTION_CAPTURE_GROUP`
      singleline: false, // `ONIG_OPTION_SINGLELINE`
      ...options.rules,
    },
  };
  if (typeof pattern !== 'string') {
    throw new Error('String expected as pattern');
  }
  const flagProperties = getFlagProperties(opts.flags);
  const xStack = [flagProperties.extended];
  const context: Context = {
    captureGroup: opts.rules.captureGroup,
    // Always at least has the top-level flag x
    getCurrentModX() {return xStack.at(-1)!},
    numOpenGroups: 0,
    popModX() {xStack.pop()},
    pushModX(isXOn) {xStack.push(isXOn)},
    replaceCurrentModX(isXOn) {xStack[xStack.length - 1] = isXOn},
    singleline: opts.rules.singleline,
  };
  let tokens: Array<Token | IntermediateToken> = [];
  let match: RegExpExecArray | null;
  tokenRe.lastIndex = 0;
  while ((match = tokenRe.exec(pattern))) {
    const result = getTokenWithDetails(context, pattern, match[0], tokenRe.lastIndex);
    if (result.tokens) {
      tokens.push(...result.tokens);
    } else if (result.token) {
      tokens.push(result.token);
    }
    if (result.lastIndex !== undefined) {
      tokenRe.lastIndex = result.lastIndex;
    }
  }

  const potentialUnnamedCaptureTokens: Array<GroupOpenToken> = [];
  let numNamedAndOptInUnnamedCaptures = 0;
  tokens.filter(t => t.type === 'GroupOpen').forEach(t => {
    if (t.kind === 'capturing') {
      t.number = ++numNamedAndOptInUnnamedCaptures;
    } else if (t.raw === '(') {
      potentialUnnamedCaptureTokens.push(t);
    }
  });
  // Enable unnamed capturing groups if no named captures (when `captureGroup` not enabled)
  if (!numNamedAndOptInUnnamedCaptures) {
    potentialUnnamedCaptureTokens.forEach((t, i) => {
      t.kind = 'capturing';
      t.number = i + 1;
    });
  }
  const numCaptures = numNamedAndOptInUnnamedCaptures || potentialUnnamedCaptureTokens.length;
  // Can now split escaped nums accurately, accounting for number of captures
  const tokensWithoutIntermediate = tokens.map(
    t => t.type === 'EscapedNumber' ? splitEscapedNumberToken(t, numCaptures) : t
  ).flat();

  return {
    tokens: tokensWithoutIntermediate,
    flags: flagProperties,
  };
}

function getTokenWithDetails(context: Context, pattern: string, m: string, lastIndex: number): {
  token: Token | IntermediateToken;
  tokens?: never;
  lastIndex?: number;
} | {
  token?: never;
  tokens: Array<Token | IntermediateToken>;
  lastIndex?: number;
} | {
  token?: never;
  tokens?: never;
  lastIndex: number;
} {
  const [m0, m1] = m;

  if (m === '[' || m === '[^') {
    const result = getAllTokensForCharClass(pattern, m, lastIndex);
    return {
      // Array of all of the char class's tokens
      tokens: result.tokens,
      // Jump forward to the end of the char class
      lastIndex: result.lastIndex,
    };
  }

  if (m0 === '\\') {
    if ('AbBGyYzZ'.includes(m1)) {
      return {
        token: createAssertionToken(m, m),
      };
    }
    if (/^\\g[<']/.test(m)) {
      if (!/^\\g(?:<[^>]+>|'[^']+')$/.test(m)) {
        throw new Error(`Invalid group name "${m}"`);
      }
      return {
        token: createSubroutineToken(m),
      };
    }
    if (/^\\k[<']/.test(m)) {
      if (!/^\\k(?:<[^>]+>|'[^']+')$/.test(m)) {
        throw new Error(`Invalid group name "${m}"`);
      }
      return {
        token: createBackreferenceToken(m),
      };
    }
    if (m1 === 'K') {
      return {
        token: createDirectiveToken('keep', m),
      };
    }
    if (m1 === 'N' || m1 === 'R') {
      return {
        token: createCharacterSetToken('newline', m, {
          // `\N` and `\R` are not actually opposites since the former only excludes `\n`
          negate: m1 === 'N',
        }),
      };
    }
    if (m1 === 'O') {
      return {
        token: createCharacterSetToken('any', m),
      };
    }
    if (m1 === 'X') {
      return {
        token: createCharacterSetToken('text_segment', m),
      };
    }
    // Run last since it assumes an identity escape as final condition
    const result = tokenizeSharedEscape(m, {inCharClass: false});
    return Array.isArray(result) ? {tokens: result} : {token: result};
  }

  if (m0 === '(') {
    if (m1 === '*') {
      return {
        token: tokenizeNamedCallout(m),
      };
    }
    if (m === '(?{') {
      throw new Error(`Unsupported callout "${m}"`);
    }
    // Comment group
    if (m.startsWith('(?#')) {
      // Everything except the closing unescaped `)` is included in the match
      if (pattern[lastIndex] !== ')') {
        throw new Error('Unclosed comment group "(?#"');
      }
      return {
        // Jump forward to after the closing paren
        lastIndex: lastIndex + 1,
      };
    }
    // Flag modifier (directive or group opener)
    if (/^\(\?[-imx]+[:)]$/.test(m)) {
      return {
        token: tokenizeFlagModifier(m, context),
      };
    }
    // --- Remaining group types all reuse current flag x status ---
    context.pushModX(context.getCurrentModX());
    context.numOpenGroups++;
    if (
      // Unnamed capture if no named captures present and `captureGroup` not enabled, else
      // noncapturing group
      (m === '(' && !context.captureGroup) ||
      // Noncapturing group
      m === '(?:'
    ) {
      return {
        // For `(`, will later change to `capturing` and add `number` prop if no named captures
        token: createGroupOpenToken('group', m),
      };
    }
    // Atomic group
    if (m === '(?>') {
      return {
        token: createGroupOpenToken('atomic', m),
      };
    }
    // Lookaround
    if (m === '(?=' || m === '(?!' || m === '(?<=' || m === '(?<!') {
      return {
        token: createGroupOpenToken(m[2] === '<' ? 'lookbehind' : 'lookahead', m, {
          negate: m.endsWith('!'),
        }),
      };
    }
    // Unnamed capture when `captureGroup` enabled, or named capture (checked after lookbehind due
    // to similar syntax)
    if (
      (m === '(' && context.captureGroup) ||
      (m.startsWith('(?<') && m.endsWith('>')) ||
      (m.startsWith("(?'") && m.endsWith("'"))
    ) {
      return {
        token: createGroupOpenToken('capturing', m, {
          // Will add `number` prop in a second pass
          ...(m !== '(' && {name: m.slice(3, -1)}),
        }),
      };
    }
    if (m.startsWith('(?~')) {
      if (m === '(?~|') {
        throw new Error(`Unsupported absence function kind "${m}"`);
      }
      return {
        token: createGroupOpenToken('absence_repeater', m),
      };
    }
    if (m === '(?(') {
      // TODO: Add support
      throw new Error(`Unsupported conditional "${m}"`);
    }
    throw new Error(`Invalid or unsupported group option "${m}"`);
  }
  if (m === ')') {
    context.popModX();
    context.numOpenGroups--;
    if (context.numOpenGroups < 0) {
      throw new Error('Unmatched ")"');
    }
    return {
      token: createGroupCloseToken(m),
    };
  }

  if (context.getCurrentModX()) {
    if (m === '#') {
      // Onig's only line break char is line feed
      const end = pattern.indexOf('\n', lastIndex);
      return {
        // Jump forward to the end of the comment
        lastIndex: end === -1 ? pattern.length : end,
      };
    }
    if (/^\s$/.test(m)) {
      const re = /\s+/y;
      re.lastIndex = lastIndex;
      const rest = re.exec(pattern);
      return {
        // Jump forward to the end of the whitespace
        lastIndex: rest ? re.lastIndex : lastIndex,
      };
    }
  }

  if (m === '.') {
    return {
      token: createCharacterSetToken('dot', m),
    };
  }

  if (m === '^' || m === '$') {
    const kind = context.singleline ? {
      '^': r`\A`,
      '$': r`\Z`,
    }[m] : m;
    return {
      token: createAssertionToken(kind, m),
    };
  }

  if (m === '|') {
    return {
      token: createAlternatorToken(m),
    };
  }

  if (quantifierRe.test(m)) {
    return {
      tokens: splitQuantifierMatch(m),
    };
  }

  // `cpOf` asserts that it's a single code point
  return {
    token: createCharacterToken(cpOf(m), m),
  };
}

function getAllTokensForCharClass(pattern: string, opener: CharacterClassOpener, lastIndex: number): {
  tokens: Array<Token | IntermediateToken>;
  lastIndex: number;
} {
  const tokens: Array<Token | IntermediateToken> = [createCharacterClassOpenToken(opener[1] === '^', opener)];
  let numCharClassesOpen = 1;
  let match: RegExpExecArray | null;
  charClassTokenRe.lastIndex = lastIndex;
  while ((match = charClassTokenRe.exec(pattern))) {
    const m = match[0];
    // Start of nested char class
    // POSIX classes are handled as a single token; not as a nested char class
    if (m[0] === '[' && m[1] !== ':') {
      numCharClassesOpen++;
      tokens.push(createCharacterClassOpenToken(m[1] === '^', m as CharacterClassOpener));
    } else if (m === ']') {
      // Always at least includes the char class opener
      if (tokens.at(-1)!.type === 'CharacterClassOpen') {
        // Allow unescaped `]` as leading char
        tokens.push(createCharacterToken(93, m));
      } else {
        numCharClassesOpen--;
        tokens.push(createCharacterClassCloseToken(m));
        if (!numCharClassesOpen) {
          break;
        }
      }
    } else {
      const result = tokenizeAnyTokenWithinCharClass(m);
      if (Array.isArray(result)) {
        tokens.push(...result);
      } else {
        tokens.push(result);
      }
    }
  }
  return {
    tokens,
    lastIndex: charClassTokenRe.lastIndex || pattern.length,
  };
}

function tokenizeAnyTokenWithinCharClass(raw: string): Token | IntermediateToken | Array<Token> {
  if (raw[0] === '\\') {
    // Assumes an identity escape as final condition
    return tokenizeSharedEscape(raw, {inCharClass: true});
  }
  // POSIX class: `[:name:]` or `[:^name:]`
  if (raw[0] === '[') {
    const posix = /\[:(?<negate>\^?)(?<name>[a-z]+):\]/.exec(raw);
    if (!posix || !PosixClassNames.has(posix.groups!.name)) {
      throw new Error(`Invalid POSIX class "${raw}"`);
    }
    return createCharacterSetToken('posix', raw, {
      value: posix.groups!.name,
      negate: !!posix.groups!.negate,
    });
  }
  // Range (possibly invalid) or literal hyphen
  if (raw === '-') {
    return createCharacterClassHyphenToken(raw);
  }
  if (raw === '&&') {
    return createCharacterClassIntersectorToken(raw);
  }
  // `cpOf` asserts that it's a single code point
  return createCharacterToken(cpOf(raw), raw);
}

// Tokens shared by base syntax and char class syntax that start with `\`
function tokenizeSharedEscape(raw: string, {inCharClass}: {inCharClass: boolean}): Token | IntermediateToken | Array<Token> {
  const char1 = raw[1];
  if (char1 === 'c' || char1 === 'C') {
    return tokenizeControlCharacter(raw);
  }
  if ('dDhHsSwW'.includes(char1)) {
    return tokenizeShorthand(raw);
  }
  if (raw.startsWith(r`\o{`)) {
    throw new Error(`Incomplete, invalid, or unsupported octal code point "${raw}"`);
  }
  if (/^\\[pP]\{/.test(raw)) {
    if (raw.length === 3) {
      throw new Error(`Incomplete or invalid Unicode property "${raw}"`);
    }
    return tokenizeUnicodeProperty(raw);
  }
  // Hex UTF-8 encoded byte sequence
  if (/^\\x[89A-Fa-f]\p{AHex}/u.test(raw)) {
    try {
      const bytes = raw.split(/\\x/).slice(1).map(hex => parseInt(hex, 16));
      const decoded = new TextDecoder('utf-8', {
        ignoreBOM: true,
        fatal: true,
      }).decode(new Uint8Array(bytes));
      const encoder = new TextEncoder();
      const tokens = [...decoded].map(char => {
        // Since this regenerates `raw`, it might have different casing for hex A-F than the input
        const raw = [...encoder.encode(char)].map(byte => `\\x${byte.toString(16)}`).join('');
        return createCharacterToken(cpOf(char), raw);
      });
      return tokens;
    } catch {
      throw new Error(`Multibyte code "${raw}" incomplete or invalid in Oniguruma`);
    }
  }
  if (char1 === 'u' || char1 === 'x') {
    return createCharacterToken(getValidatedHexCharCode(raw), raw);
  }
  if (EscapeCharCodes.has(char1)) {
    return createCharacterToken(EscapeCharCodes.get(char1)!, raw);
  }
  // Escaped number: backref (possibly invalid), null, octal, or identity escape, possibly followed
  // by 1-2 literal digits
  if (/\d/.test(char1)) {
    return createEscapedNumberToken(inCharClass, raw);
  }
  if (raw === '\\') {
    throw new Error(r`Incomplete escape "\"`);
  }
  // Meta `\M-x` and `\M-\C-x` are unsupported; avoid treating as an identity escape
  if (char1 === 'M') {
    // TODO: Add support. See:
    // - <github.com/kkos/oniguruma/blob/master/doc/SYNTAX.md#12-onig_syn_op2_esc_capital_m_bar_meta-enable-m-x>
    // - <github.com/kkos/oniguruma/blob/43a8c3f3daf263091f3a74019d4b32ebb6417093/src/regparse.c#L4695>
    // - <github.com/ammar/regexp_parser/blob/8851030feda68223d74f502335fb254a20d77016/lib/regexp_parser/expression/classes/escape_sequence.rb#L75>
    throw new Error(`Unsupported meta "${raw}"`);
  }
  // Identity escape; count code point length
  if ([...raw].length === 2) {
    return createCharacterToken(raw.codePointAt(1)!, raw);
  }
  throw new Error(`Unexpected escape "${raw}"`);
}

// --------------------------------
// --- Token creation and types ---
// --------------------------------

type AlternatorToken = {
  type: 'Alternator';
  raw: '|';
};
function createAlternatorToken(raw: '|'): AlternatorToken {
  return {
    type: 'Alternator',
    raw,
  };
}

type AssertionToken = {
  type: 'Assertion';
  kind: string;
  raw: string;
};
function createAssertionToken(kind: string, raw: string): AssertionToken {
  return {
    type: 'Assertion',
    kind,
    raw,
  };
}

type BackreferenceToken = {
  type: 'Backreference';
  raw: string;
};
function createBackreferenceToken(raw: string): BackreferenceToken {
  return {
    type: 'Backreference',
    raw,
  };
}

type CharacterToken = {
  type: 'Character';
  value: number;
  raw: string;
};
function createCharacterToken(value: number, raw: string): CharacterToken {
  return {
    type: 'Character',
    value,
    raw,
  };
}

type CharacterClassCloseToken = {
  type: 'CharacterClassClose';
  raw: ']';
};
function createCharacterClassCloseToken(raw: ']'): CharacterClassCloseToken {
  return {
    type: 'CharacterClassClose',
    raw,
  };
}

type CharacterClassHyphenToken = {
  type: 'CharacterClassHyphen';
  raw: '-';
};
function createCharacterClassHyphenToken(raw: '-'): CharacterClassHyphenToken {
  return {
    type: 'CharacterClassHyphen',
    raw,
  };
}

type CharacterClassIntersectorToken = {
  type: 'CharacterClassIntersector';
  raw: '&&';
};
function createCharacterClassIntersectorToken(raw: '&&'): CharacterClassIntersectorToken {
  return {
    type: 'CharacterClassIntersector',
    raw,
  };
}

type CharacterClassOpenToken = {
  type: 'CharacterClassOpen';
  negate: boolean;
  raw: CharacterClassOpener;
};
type CharacterClassOpener = '[' | '[^';
function createCharacterClassOpenToken(negate: boolean, raw: CharacterClassOpener): CharacterClassOpenToken {
  return {
    type: 'CharacterClassOpen',
    negate,
    raw,
  };
}

type CharacterSetToken = {
  type: 'CharacterSet';
  kind: TokenCharacterSetKind;
  value?: string;
  negate?: boolean;
  raw: string;
};
function createCharacterSetToken(
  kind: TokenCharacterSetKind,
  raw: string,
  options: {
    value?: string;
    negate?: boolean;
  } = {}
): CharacterSetToken {
  return {
    type: 'CharacterSet',
    kind,
    ...options,
    raw,
  };
}

type DirectiveToken = {
  type: 'Directive';
  raw: string;
} & ({
  kind: 'keep';
  flags?: never;
} | {
  kind: 'flags';
  flags: FlagGroupModifiers;
});
function createDirectiveToken(kind: TokenDirectiveKind, raw: string, options: {flags?: FlagGroupModifiers} = {}): DirectiveToken {
  if (kind === 'keep') {
    return {
      type: 'Directive',
      kind,
      raw,
    };
  }
  return {
    type: 'Directive',
    kind,
    flags: throwIfNullish(options.flags),
    raw,
  };
}

type EscapedNumberToken = {
  type: 'EscapedNumber';
  inCharClass: boolean;
  raw: string;
};
/**
Intermediate representation only; will become a `Backreference` or one or more `Character`s.
*/
function createEscapedNumberToken(inCharClass: boolean, raw: string): EscapedNumberToken {
  return {
    type: 'EscapedNumber',
    inCharClass,
    raw,
  };
}

type GroupCloseToken = {
  type: 'GroupClose';
  raw: ')';
};
function createGroupCloseToken(raw: ')'): GroupCloseToken {
  return {
    type: 'GroupClose',
    raw,
  };
}

type GroupOpenToken = {
  type: 'GroupOpen';
  kind: TokenGroupOpenKind;
  flags?: FlagGroupModifiers;
  name?: string;
  number?: number;
  negate?: boolean;
  raw: string;
};
function createGroupOpenToken(
  kind: TokenGroupOpenKind,
  raw: string,
  options: {
    flags?: FlagGroupModifiers;
    name?: string;
    number?: number;
    negate?: boolean;
  } = {}
): GroupOpenToken {
  return {
    type: 'GroupOpen',
    kind,
    ...options,
    raw,
  };
}

type NamedCalloutToken = {
  type: 'NamedCallout';
  kind: TokenNamedCalloutKind;
  tag: string | null;
  arguments: Array<string | number> | null;
  raw: string;
};
function createNamedCalloutToken(
  kind: TokenNamedCalloutKind,
  tag: string | null,
  args: Array<string | number> | null,
  raw: string
): NamedCalloutToken {
  return {
    type: 'NamedCallout',
    kind,
    tag,
    arguments: args,
    raw,
  };
};

type QuantifierToken = {
  type: 'Quantifier';
  kind: TokenQuantifierKind;
  min: number;
  max: number;
  raw: string;
};
function createQuantifierToken(
  kind: TokenQuantifierKind,
  min: number,
  max: number,
  raw: string
): QuantifierToken {
  return {
    type: 'Quantifier',
    kind,
    min,
    max,
    raw,
  };
}

type SubroutineToken = {
  type: 'Subroutine';
  raw: string;
};
function createSubroutineToken(raw: string): SubroutineToken {
  return {
    type: 'Subroutine',
    raw,
  };
}

// ---------------
// --- Helpers ---
// ---------------

type FlagProperties = {
  ignoreCase: boolean;
  dotAll: boolean;
  extended: boolean;
  digitIsAscii: boolean;
  posixIsAscii: boolean;
  spaceIsAscii: boolean;
  wordIsAscii: boolean;
  textSegmentMode: 'grapheme' | 'word' | null;
};

type FlagGroupModifiers = {
  enable?: FlagGroupSwitches;
  disable?: FlagGroupSwitches;
};

type FlagGroupSwitches = {
  ignoreCase?: true;
  dotAll?: true;
  extended?: true;
};

const CalloutNames = new Set<Uppercase<Exclude<TokenNamedCalloutKind, 'custom'>>>([
  'COUNT',
  'CMP',
  'ERROR',
  'FAIL',
  'MAX',
  'MISMATCH',
  'SKIP',
  'TOTAL_COUNT',
]);

const EscapeCharCodes = new Map([
  ['a',  7], // alert/bell (Not available in JS)
  ['b',  8], // backspace (only in char classes)
  ['e', 27], // escape (Not available in JS)
  ['f', 12], // form feed
  ['n', 10], // line feed
  ['r', 13], // carriage return
  ['t',  9], // horizontal tab
  ['v', 11], // vertical tab
]);

// Expects `\cx` or `\C-x`
function tokenizeControlCharacter(raw: string): CharacterToken {
  const char = raw[1] === 'c' ? raw[2] : raw[3];
  if (!char || !/[A-Za-z]/.test(char)) {
    // Unlike JS, Onig allows any char to follow `\c` or `\C-`, but this is an extreme edge case
    // TODO: Add support. See:
    // - <github.com/kkos/oniguruma/blob/master/doc/SYNTAX.md#11-onig_syn_op2_esc_capital_c_bar_control-enable-c-x>
    // - <github.com/kkos/oniguruma/blob/43a8c3f3daf263091f3a74019d4b32ebb6417093/src/regparse.c#L4695>
    throw new Error(`Unsupported control character "${raw}"`);
  }
  return createCharacterToken(cpOf(char.toUpperCase()) - 64, raw);
}

function tokenizeFlagModifier(raw: string, context: Context): DirectiveToken | GroupOpenToken {
  // Allows multiple `-` and solo `-` without `on` or `off` flags
  let {on, off} = /^\(\?(?<on>[imx]*)(?:-(?<off>[-imx]*))?/.exec(raw)!.groups as {on: string, off: string | undefined};
  off ??= '';
  // Flag x is used directly by the tokenizer since it changes how to interpret the pattern
  const isXOn = (context.getCurrentModX() || on.includes('x')) && !off.includes('x');
  const enabledFlags = getFlagGroupSwitches(on);
  const disabledFlags = getFlagGroupSwitches(off);
  const flagChanges: FlagGroupModifiers = {};
  enabledFlags && (flagChanges.enable = enabledFlags);
  disabledFlags && (flagChanges.disable = disabledFlags);
  // Flag directive; ex: `(?im-x)`
  if (raw.endsWith(')')) {
    // Replace flag x value until the end of the current group
    context.replaceCurrentModX(isXOn);
    // Can't remove flag directives without flags like `(?-)`; they affect following quantifiers
    return createDirectiveToken('flags', raw, {
      flags: flagChanges,
    });
  }
  // Flag group opener; ex: `(?im-x:`
  if (raw.endsWith(':')) {
    context.pushModX(isXOn);
    context.numOpenGroups++;
    return createGroupOpenToken('group', raw, {
      ...((enabledFlags || disabledFlags) && {flags: flagChanges}),
    });
  }
  throw new Error(`Unexpected flag modifier "${raw}"`);
}

function tokenizeNamedCallout(raw: string): NamedCalloutToken {
  const callout = /\(\*(?<name>[A-Za-z_]\w*)?(?:\[(?<tag>(?:[A-Za-z_]\w*)?)\])?(?:\{(?<args>[^}]*)\})?\)/.exec(raw);
  if (!callout) {
    throw new Error(`Incomplete or invalid named callout "${raw}"`);
  }
  const {name, tag, args} = callout.groups as Partial<{
    name: string;
    tag: string;
    args: string;
  }>;
  if (!name) {
    throw new Error(`Invalid named callout "${raw}"`);
  }
  if (tag === '') {
    throw new Error(`Named callout tag with empty value not allowed "${raw}"`);
  }
  const argsArray: Array<string | number> = args ?
    args.split(',').
      // Onig skips over/ignores redundant/unnecessary commas
      filter(arg => arg !== '').
      map(arg => /^[+-]?\d+$/.test(arg) ? +arg : arg) :
    [];
  const [arg0, arg1, arg2] = argsArray;
  const kind: TokenNamedCalloutKind = CalloutNames.has(name as Uppercase<Exclude<TokenNamedCalloutKind, 'custom'>>) ?
    name.toLowerCase() as TokenNamedCalloutKind :
    'custom';
  switch (kind) {
    case 'fail':
    case 'mismatch':
    case 'skip':
      if (argsArray.length > 0) {
        throw new Error(`Named callout arguments not allowed "${argsArray}"`);
      }
      break;
    case 'error':
      if (argsArray.length > 1) {
        throw new Error(`Named callout allows only one argument "${argsArray}"`);
      }
      if (typeof arg0 === 'string') {
        throw new Error(`Named callout argument must be a number "${arg0}"`);
      }
      break;
    case 'max':
      if (!argsArray.length || argsArray.length > 2) {
        throw new Error(`Named callout must have one or two arguments "${argsArray}"`);
      }
      if (typeof arg0 === 'string' && !/^[A-Za-z_]\w*$/.test(arg0)) {
        throw new Error(`Named callout argument one must be a tag or number "${arg0}"`);
      }
      if (argsArray.length === 2 && (typeof arg1 === 'number' || !/^[<>X]$/.test(arg1))) {
        throw new Error(`Named callout optional argument two must be '<', '>', or 'X' "${arg1}"`);
      }
      break;
    case 'count':
    case 'total_count':
      if (argsArray.length > 1) {
        throw new Error(`Named callout allows only one argument "${argsArray}"`);
      }
      if (argsArray.length === 1 && (typeof arg0 === 'number' || !/^[<>X]$/.test(arg0))) {
        throw new Error(`Named callout optional argument must be '<', '>', or 'X' "${arg0}"`);
      }
      break;
    case 'cmp':
      if (argsArray.length !== 3) {
        throw new Error(`Named callout must have three arguments "${argsArray}"`);
      }
      if (typeof arg0 === 'string' && !/^[A-Za-z_]\w*$/.test(arg0)) {
        throw new Error(`Named callout argument one must be a tag or number "${arg0}"`);
      }
      if (typeof arg1 === 'number' || !/^(?:[<>!=]=|[<>])$/.test(arg1)) {
        throw new Error(`Named callout argument two must be '==', '!=', '>', '<', '>=', or '<=' "${arg1}"`);
      }
      if (typeof arg2 === 'string' && !/^[A-Za-z_]\w*$/.test(arg2)) {
        throw new Error(`Named callout argument three must be a tag or number "${arg2}"`);
      }
      break;
    case 'custom':
      // TODO: Can support custom callout names via a new option that allows providing a list of
      // allowed, non-built-in names
      throw new Error(`Undefined callout name "${name}"`);
    default:
      throw new Error(`Unexpected named callout kind "${kind}"`);
  }
  // TODO: If supporting custom callout names in the future (with an added `name` property for
  // `NamedCalloutToken`), will need to set `name` to `null` if `kind` isn't `'custom'`
  return createNamedCalloutToken(kind, tag ?? null, args?.split(',') ?? null, raw);
}

function tokenizeQuantifier(raw: string): QuantifierToken {
  let kind: TokenQuantifierKind = null!;
  let min: number;
  let max: number;
  if (raw[0] === '{') {
    const {minStr, maxStr} =
      /^\{(?<minStr>\d*)(?:,(?<maxStr>\d*))?/.exec(raw)!.groups as {minStr: string, maxStr: string | undefined};
    const limit = 100_000;
    if (+minStr > limit || (maxStr && +maxStr > limit)) {
      throw new Error('Quantifier value unsupported in Oniguruma');
    }
    min = +minStr;
    max = maxStr === undefined ? +minStr : (maxStr === '' ? Infinity : +maxStr);
    // By default, Onig doesn't support making interval quantifiers possessive with a `+` suffix;
    // uses reversed range instead
    if (min > max) {
      kind = 'possessive';
      [min, max] = [max, min];
    }
    if (raw.endsWith('?')) {
      if (kind === 'possessive') {
        // TODO: <github.com/slevithan/oniguruma-parser/issues/10>
        throw new Error('Unsupported possessive interval quantifier chain with "?"');
      }
      kind = 'lazy';
    } else if (!kind) {
      kind = 'greedy';
    }
  } else {
    min = raw[0] === '+' ? 1 : 0;
    max = raw[0] === '?' ? 1 : Infinity;
    kind = raw[1] === '+' ? 'possessive' : (raw[1] === '?' ? 'lazy' : 'greedy');
  }
  return createQuantifierToken(kind, min, max, raw);
}

function tokenizeShorthand(raw: string): CharacterSetToken {
  const lower = raw[1].toLowerCase();
  return createCharacterSetToken({
    'd': 'digit',
    'h': 'hex',
    's': 'space',
    'w': 'word',
  }[lower] as TokenCharacterSetKind, raw, {
    negate: raw[1] !== lower,
  });
}

function tokenizeUnicodeProperty(raw: string): CharacterSetToken {
  const {p, neg, value} = /^\\(?<p>[pP])\{(?<neg>\^?)(?<value>[^}]+)/.exec(raw)!.groups!;
  const negate = (p === 'P' && !neg) || (p === 'p' && !!neg);
  return createCharacterSetToken('property', raw, {
    value,
    negate,
  });
}

function getFlagGroupSwitches(flags: string): FlagGroupSwitches | null {
  // Don't include `false` for flags that aren't included
  const obj: FlagGroupSwitches = {};
  if (flags.includes('i')) {
    obj.ignoreCase = true;
  }
  if (flags.includes('m')) {
    // Onig flag m is equivalent to JS flag s
    obj.dotAll = true;
  }
  if (flags.includes('x')) {
    obj.extended = true;
  }
  return Object.keys(obj).length ? obj : null;
}

function getFlagProperties(flags: string): FlagProperties {
  const flagProperties: FlagProperties = {
    ignoreCase: false,
    dotAll: false,
    extended: false,
    digitIsAscii: false,
    posixIsAscii: false,
    spaceIsAscii: false,
    wordIsAscii: false,
    textSegmentMode: null,
  };
  for (let i = 0; i < flags.length; i++) {
    const char = flags[i];
    if (!'imxDPSWy'.includes(char)) {
      throw new Error(`Invalid flag "${char}"`);
    }
    // Flags y{g}, y{w} are currently only supported via the top-level `flags` option
    if (char === 'y') {
      if (!/^y{[gw]}/.test(flags.slice(i))) {
        throw new Error('Invalid or unspecified flag "y" mode');
      }
      // If text segment mode flags appear multiple times, use the last one
      flagProperties.textSegmentMode = flags[i + 2] === 'g' ? 'grapheme' : 'word';
      i += 3;
      continue;
    }
    flagProperties[{
      i: 'ignoreCase',
      // Flag m is called `multiline` in Onig, but that has a different meaning in JS. Onig flag m
      // is equivalent to JS flag s
      m: 'dotAll',
      // Flag x is fully handled during tokenization
      x: 'extended',
      // Flags D, P, S, W are currently only supported via the top-level `flags` option
      D: 'digitIsAscii',
      P: 'posixIsAscii',
      S: 'spaceIsAscii',
      W: 'wordIsAscii',
    }[char] as Exclude<keyof FlagProperties, 'textSegmentMode'>] = true;
  }
  return flagProperties;
}

// - Unenclosed `\xNN` above 0x7F is handled elsewhere as a UTF-8 encoded byte sequence
// - Enclosed `\x{}` with value above 0x10FFFF is allowed here; handled in the parser
function getValidatedHexCharCode(raw: string): number {
  // Note: Onig 6.9.10 and earlier have a bug where pattern-terminating `\u` and `\x` are treated
  // as identity escapes; see <github.com/kkos/oniguruma/issues/343>. Don't emulate these bugs.
  // Additionally, Onig treats bare `\x` as equivalent to `\0`, and treats incomplete `\x{` (with
  // the brace but not immediately followed by a hex digit) as an identity escape, so e.g. `\x{`
  // matches `x{` and `^\x{,2}$` matches `xx`, but `\x{2,}` and `\x{0,2}` are errors. Currently,
  // this library treats all such cases as errors
  if (/^(?:\\u(?!\p{AHex}{4})|\\x(?!\p{AHex}{1,2}|\{\p{AHex}{1,8}\}))/u.test(raw)) {
    throw new Error(`Incomplete or invalid escape "${raw}"`);
  }
  // Might include leading 0s
  const hex = raw[2] === '{' ?
    /^\\x\{\s*(?<hex>\p{AHex}+)/u.exec(raw)!.groups!.hex :
    raw.slice(2);
  return parseInt(hex, 16);
}

// Value is 1-3 digits, which can be a backref (possibly invalid), null, octal, or identity escape,
// possibly followed by 1-2 literal digits
function splitEscapedNumberToken(token: EscapedNumberToken, numCaptures: number): Array<BackreferenceToken> | Array<CharacterToken> {
  const {raw, inCharClass} = token;
  // Keep any leading 0s since they indicate octal
  const value = raw.slice(1);
  // Backref (possibly invalid)
  if (
    !inCharClass &&
    ( // Single digit 1-9 outside a char class is always treated as a backref
      (value !== '0' && value.length === 1) ||
      // Leading 0 makes it octal; backrefs can't include following literal digits
      (value[0] !== '0' && +value <= numCaptures)
    )
  ) {
    return [createBackreferenceToken(raw)];
  }
  const tokens: Array<CharacterToken> = [];
  // Returns 1-3 matches; the first (only) might be octal
  const matches = value.match(/^[0-7]+|\d/g)!;
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    let value: number;
    // Octal digits are 0-7
    if (i === 0 && m !== '8' && m !== '9') {
      value = parseInt(m, 8);
      if (value > 0o177) {
        // Octal UTF-8 encoded byte sequence; not yet supported
        throw new Error(r`Octal encoded byte above 177 unsupported "${raw}"`);
      }
    } else {
      value = cpOf(m);
    }
    tokens.push(createCharacterToken(value, (i === 0 ? '\\' : '') + m));
  }
  return tokens;
}

function splitQuantifierMatch(str: string): Array<QuantifierToken> {
  const tokens: Array<QuantifierToken> = [];
  // `str` is one or more quantifiers in a chain. It can't be split by a regex because of one edge
  // case where we have to compare numeric values: although `{1,2}?` is a single, lazy quantifier,
  // a reversed (possessive) interval quantifier like `{2,1}` can't be both possessive and lazy, so
  // any following `?`, `??`, or `?+` is a second, chained quantifier (i.e., `{2,1}?` is equivalent
  // to `{2,1}{0,1}` or `{2,0}`)
  const withG = new RegExp(quantifierRe, 'gy');
  let match: RegExpExecArray | null;
  while ((match = withG.exec(str))) {
    const m = match[0];
    if (m[0] === '{') {
      // Doesn't need to handle fixed `{n}`, infinite max `{n,}`, or implicit zero min `{,n}`
      // since, according to Onig syntax rules, those can't be possessive
      const parts = /^\{(?<min>\d+),(?<max>\d+)\}\??$/.exec(m);
      if (parts) {
        const {min, max} = parts.groups as {min: string, max: string};
        if (+min > +max && m.endsWith('?')) {
          // Leave the trailing `?` for the next match
          withG.lastIndex--;
          tokens.push(tokenizeQuantifier(m.slice(0, -1)));
          continue;
        }
      }
    }
    tokens.push(tokenizeQuantifier(m));
  }
  return tokens;
}

export {
  type AlternatorToken,
  type AssertionToken,
  type BackreferenceToken,
  type CharacterToken,
  type CharacterClassCloseToken,
  type CharacterClassHyphenToken,
  type CharacterClassIntersectorToken,
  type CharacterClassOpenToken,
  type CharacterSetToken,
  type DirectiveToken,
  type FlagGroupModifiers,
  type FlagProperties,
  type GroupCloseToken,
  type GroupOpenToken,
  type NamedCalloutToken,
  type QuantifierToken,
  type SubroutineToken,
  type Token,
  type TokenCharacterSetKind,
  type TokenDirectiveKind,
  type TokenNamedCalloutKind,
  type TokenQuantifierKind,
  tokenize,
};

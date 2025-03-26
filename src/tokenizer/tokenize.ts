import {PosixClassNames, r, throwIfNullable} from '../utils.js';

const TokenTypes = {
  Alternator: 'Alternator',
  Assertion: 'Assertion',
  Backreference: 'Backreference',
  Character: 'Character',
  CharacterClassClose: 'CharacterClassClose',
  CharacterClassHyphen: 'CharacterClassHyphen',
  CharacterClassIntersector: 'CharacterClassIntersector',
  CharacterClassOpen: 'CharacterClassOpen',
  CharacterSet: 'CharacterSet',
  Directive: 'Directive',
  GroupClose: 'GroupClose',
  GroupOpen: 'GroupOpen',
  Quantifier: 'Quantifier',
  Subroutine: 'Subroutine',
  // Intermediate representation only
  EscapedNumber: 'EscapedNumber',
} as const;

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
  QuantifierToken |
  SubroutineToken;

type TokenIncludingIntermediate = Token | EscapedNumberToken;

const TokenCharacterSetKinds = {
  any: 'any',
  digit: 'digit',
  dot: 'dot',
  grapheme: 'grapheme',
  hex: 'hex',
  newline: 'newline',
  posix: 'posix',
  property: 'property',
  space: 'space',
  word: 'word',
} as const;

const TokenDirectiveKinds = {
  flags: 'flags',
  keep: 'keep',
} as const;

const TokenGroupKinds = {
  absent_repeater: 'absent_repeater',
  atomic: 'atomic',
  capturing: 'capturing',
  group: 'group',
  lookahead: 'lookahead',
  lookbehind: 'lookbehind',
} as const;

const TokenQuantifierKinds = {
  greedy: 'greedy',
  lazy: 'lazy',
  possessive: 'possessive',
} as const;

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
    | \*[^)]*\)
  )?
  | ${quantifierRe.source}
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

type RegexFlags = {
  ignoreCase: boolean;
  dotAll: boolean;
  extended: boolean;
  digitIsAscii: boolean;
  posixIsAscii: boolean;
  spaceIsAscii: boolean;
  wordIsAscii: boolean;
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

type Context = {
  captureGroup: boolean;
  getCurrentModX(): boolean;
  numOpenGroups: number;
  popModX(): void;
  pushModX(isXOn: boolean): void;
  replaceCurrentModX(isXOn: boolean): void;
  singleline: boolean;
};

type TokenizerOptions = {
  flags?: string;
  rules?: {
    captureGroup?: boolean;
    singleline?: boolean;
  };
};

type TokenizerResult = {
  tokens: Array<Token>;
  flags: RegexFlags;
};

function tokenize(pattern: string, options: TokenizerOptions = {}): TokenizerResult {
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
  const flagsObj = getFlagsObj(opts.flags);
  const xStack = [flagsObj.extended];
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
  let tokens: Array<TokenIncludingIntermediate> = [];
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
  tokens.filter(t => t.type === TokenTypes.GroupOpen).forEach(t => {
    if (t.kind === TokenGroupKinds.capturing) {
      t.number = ++numNamedAndOptInUnnamedCaptures;
    } else if (t.raw === '(') {
      potentialUnnamedCaptureTokens.push(t);
    }
  });
  // Enable unnamed capturing groups if no named captures (when `captureGroup` not enabled)
  if (!numNamedAndOptInUnnamedCaptures) {
    potentialUnnamedCaptureTokens.forEach((t, i) => {
      t.kind = TokenGroupKinds.capturing;
      t.number = i + 1;
    });
  }
  const numCaptures = numNamedAndOptInUnnamedCaptures || potentialUnnamedCaptureTokens.length;
  // Can now split escaped nums accurately, accounting for number of captures
  const tokensWithoutIntermediate = tokens.map(
    t => t.type === TokenTypes.EscapedNumber ? splitEscapedNumberToken(t, numCaptures) : t
  ).flat();

  return {
    tokens: tokensWithoutIntermediate,
    flags: flagsObj,
  };
}

function getTokenWithDetails(context: Context, pattern: string, m: string, lastIndex: number): {
  token?: never;
  tokens: Array<TokenIncludingIntermediate>;
  lastIndex?: number;
} | {
  token: TokenIncludingIntermediate;
  tokens?: never;
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
        token: createDirectiveToken(TokenDirectiveKinds.keep, m),
      };
    }
    if (m1 === 'N' || m1 === 'R') {
      return {
        token: createCharacterSetToken(TokenCharacterSetKinds.newline, m, {
          // `\N` and `\R` are not actually opposites since the former only excludes `\n`
          negate: m1 === 'N',
        }),
      };
    }
    if (m1 === 'O') {
      return {
        token: createCharacterSetToken(TokenCharacterSetKinds.any, m),
      };
    }
    if (m1 === 'X') {
      return {
        token: createCharacterSetToken(TokenCharacterSetKinds.grapheme, m),
      };
    }
    // Run last since it assumes an identity escape as final condition
    const result = createTokenForSharedEscape(m, {inCharClass: false});
    return Array.isArray(result) ? {tokens: result} : {token: result};
  }

  if (m0 === '(') {
    if (m === '(*') {
      throw new Error(`Unsupported named callout "${m}"`);
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
        token: createTokenForFlagMod(m, context),
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
        token: createGroupOpenToken(TokenGroupKinds.group, m),
      };
    }
    // Atomic group
    if (m === '(?>') {
      return {
        token: createGroupOpenToken(TokenGroupKinds.atomic, m),
      };
    }
    // Lookaround
    if (m === '(?=' || m === '(?!' || m === '(?<=' || m === '(?<!') {
      return {
        token: createGroupOpenToken(m[2] === '<' ? TokenGroupKinds.lookbehind : TokenGroupKinds.lookahead, m, {
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
        token: createGroupOpenToken(TokenGroupKinds.capturing, m, {
          // Will add `number` prop in a second pass
          ...(m !== '(' && {name: m.slice(3, -1)}),
        }),
      };
    }
    if (m.startsWith('(?~')) {
      if (m === '(?~|') {
        throw new Error(`Unsupported absent function kind "${m}"`);
      }
      return {
        token: createGroupOpenToken(TokenGroupKinds.absent_repeater, m),
      };
    }
    if (m === '(?(') {
      // Some forms are supportable; can be added
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
      token: createCharacterSetToken(TokenCharacterSetKinds.dot, m),
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
      token: createTokenForQuantifier(m),
    };
  }

  assertSingleCodePoint(m);
  return {
    token: createCharacterToken(m.codePointAt(0)!, m),
  };
}

function getAllTokensForCharClass(pattern: string, opener: CharacterClassOpener, lastIndex: number): {
  tokens: Array<TokenIncludingIntermediate>;
  lastIndex: number;
} {
  const tokens: Array<TokenIncludingIntermediate> = [createCharacterClassOpenToken(opener[1] === '^', opener)];
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
      if (tokens.at(-1)!.type === TokenTypes.CharacterClassOpen) {
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
      const result = createTokenForAnyTokenWithinCharClass(m);
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

function createTokenForAnyTokenWithinCharClass(raw: string): TokenIncludingIntermediate | Array<Token> {
  if (raw[0] === '\\') {
    // Assumes an identity escape as final condition
    return createTokenForSharedEscape(raw, {inCharClass: true});
  }
  // POSIX class: `[:name:]` or `[:^name:]`
  if (raw[0] === '[') {
    const posix = /\[:(?<negate>\^?)(?<name>[a-z]+):\]/.exec(raw);
    if (!posix || !PosixClassNames.has(posix.groups!.name)) {
      throw new Error(`Invalid POSIX class "${raw}"`);
    }
    return createCharacterSetToken(TokenCharacterSetKinds.posix, raw, {
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
  assertSingleCodePoint(raw);
  return createCharacterToken(raw.codePointAt(0)!, raw);
}

// Tokens shared by base syntax and char class syntax that start with `\`
function createTokenForSharedEscape(raw: string, {inCharClass}: {inCharClass: boolean}): TokenIncludingIntermediate | Array<Token> {
  const char1 = raw[1];
  if (char1 === 'c' || char1 === 'C') {
    return createTokenForControlChar(raw);
  }
  if ('dDhHsSwW'.includes(char1)) {
    return createTokenForShorthand(raw);
  }
  if (raw.startsWith(r`\o{`)) {
    throw new Error(`Incomplete, invalid, or unsupported octal code point "${raw}"`);
  }
  if (/^\\[pP]\{/.test(raw)) {
    if (raw.length === 3) {
      throw new Error(`Incomplete or invalid Unicode property "${raw}"`);
    }
    return createTokenForUnicodeProperty(raw);
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
        return createCharacterToken(char.codePointAt(0)!, raw);
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
    // Supportable; see:
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
    type: TokenTypes.Alternator,
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
    type: TokenTypes.Assertion,
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
    type: TokenTypes.Backreference,
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
    type: TokenTypes.Character,
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
    type: TokenTypes.CharacterClassClose,
    raw,
  };
}

type CharacterClassHyphenToken = {
  type: 'CharacterClassHyphen';
  raw: '-';
};
function createCharacterClassHyphenToken(raw: '-'): CharacterClassHyphenToken {
  return {
    type: TokenTypes.CharacterClassHyphen,
    raw,
  };
}

type CharacterClassIntersectorToken = {
  type: 'CharacterClassIntersector';
  raw: '&&';
};
function createCharacterClassIntersectorToken(raw: '&&'): CharacterClassIntersectorToken {
  return {
    type: TokenTypes.CharacterClassIntersector,
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
    type: TokenTypes.CharacterClassOpen,
    negate,
    raw,
  };
}

type CharacterSetToken = {
  type: 'CharacterSet';
  kind: keyof typeof TokenCharacterSetKinds;
  value?: string;
  negate?: boolean;
  raw: string;
};
function createCharacterSetToken(
  kind: CharacterSetToken['kind'],
  raw: string,
  options: {
    value?: string;
    negate?: boolean;
  } = {}
): CharacterSetToken {
  return {
    type: TokenTypes.CharacterSet,
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
function createDirectiveToken(kind: 'keep', raw: string): DirectiveToken;
function createDirectiveToken(kind: 'flags', raw: string, options: {flags: FlagGroupModifiers}): DirectiveToken;
function createDirectiveToken(kind: 'keep' | 'flags', raw: string, options: {flags?: FlagGroupModifiers} = {}): DirectiveToken {
  if (kind === TokenDirectiveKinds.keep) {
    return {
      type: TokenTypes.Directive,
      kind,
      raw,
    };
  }
  return {
    type: TokenTypes.Directive,
    kind,
    flags: throwIfNullable(options.flags),
    raw,
  };
}

// Intermediate representation only
type EscapedNumberToken = {
  type: 'EscapedNumber';
  inCharClass: boolean;
  raw: string;
};
function createEscapedNumberToken(inCharClass: boolean, raw: string): EscapedNumberToken {
  return {
    type: TokenTypes.EscapedNumber,
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
    type: TokenTypes.GroupClose,
    raw,
  };
}

type GroupOpenToken = {
  type: 'GroupOpen';
  kind: keyof typeof TokenGroupKinds;
  flags?: FlagGroupModifiers;
  name?: string;
  number?: number;
  negate?: boolean;
  raw: string;
};
function createGroupOpenToken(
  kind: GroupOpenToken['kind'],
  raw: string,
  options: {
    flags?: FlagGroupModifiers;
    name?: string;
    number?: number;
    negate?: boolean;
  } = {}
): GroupOpenToken {
  return {
    type: TokenTypes.GroupOpen,
    kind,
    ...options,
    raw,
  };
}

type QuantifierToken = {
  type: 'Quantifier';
  kind: keyof typeof TokenQuantifierKinds;
  min: number;
  max: number;
  raw: string;
};
function createQuantifierToken(
  kind: QuantifierToken['kind'],
  min: number,
  max: number,
  raw: string
): QuantifierToken {
  return {
    type: TokenTypes.Quantifier,
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
    type: TokenTypes.Subroutine,
    raw,
  };
}

// ------------------------
// --- Helper functions ---
// ------------------------

function assertSingleCodePoint(raw: string) {
  // Count code point length
  if ([...raw].length !== 1) {
    throw new Error(`Expected "${raw}" to be a single code point`);
  }
}

// Expects `\cx` or `\C-x`
function createTokenForControlChar(raw: string): CharacterToken {
  const char = raw[1] === 'c' ? raw[2] : raw[3];
  if (!char || !/[A-Za-z]/.test(char)) {
    // Unlike JS, Onig allows any char to follow `\c` or `\C-`, but this is an extreme edge case
    // Supportable; see <github.com/kkos/oniguruma/blob/master/doc/SYNTAX.md#11-onig_syn_op2_esc_capital_c_bar_control-enable-c-x>, <github.com/kkos/oniguruma/blob/43a8c3f3daf263091f3a74019d4b32ebb6417093/src/regparse.c#L4695>
    throw new Error(`Unsupported control character "${raw}"`);
  }
  return createCharacterToken(char.toUpperCase().codePointAt(0)! - 64, raw);
}

function createTokenForFlagMod(raw: string, context: Context): DirectiveToken | GroupOpenToken {
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
    return createDirectiveToken(TokenDirectiveKinds.flags, raw, {
      flags: flagChanges,
    });
  }
  // Flag group opener; ex: `(?im-x:`
  if (raw.endsWith(':')) {
    context.pushModX(isXOn);
    context.numOpenGroups++;
    return createGroupOpenToken(TokenGroupKinds.group, raw, {
      ...((enabledFlags || disabledFlags) && {flags: flagChanges}),
    });
  }
  throw new Error(`Unexpected flag modifier "${raw}"`);
}

function createTokenForQuantifier(raw: string): QuantifierToken {
  let kind: keyof typeof TokenQuantifierKinds;
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
    // By default, Onig doesn't support making interval quantifiers possessive with a `+` suffix
    kind = raw.endsWith('?') ? TokenQuantifierKinds.lazy : TokenQuantifierKinds.greedy;
  } else {
    min = raw[0] === '+' ? 1 : 0;
    max = raw[0] === '?' ? 1 : Infinity;
    kind = raw[1] === '+' ?
      TokenQuantifierKinds.possessive :
      (raw[1] === '?' ? TokenQuantifierKinds.lazy : TokenQuantifierKinds.greedy);
  }
  return createQuantifierToken(kind, min, max, raw);
}

function createTokenForShorthand(raw: string): CharacterSetToken {
  const lower = raw[1].toLowerCase();
  return createCharacterSetToken({
    'd': TokenCharacterSetKinds.digit,
    'h': TokenCharacterSetKinds.hex,
    's': TokenCharacterSetKinds.space,
    'w': TokenCharacterSetKinds.word,
  }[lower]!, raw, {
    negate: raw[1] !== lower,
  });
}

function createTokenForUnicodeProperty(raw: string): CharacterSetToken {
  const {p, neg, value} = /^\\(?<p>[pP])\{(?<neg>\^?)(?<value>[^}]+)/.exec(raw)!.groups!;
  const negate = (p === 'P' && !neg) || (p === 'p' && !!neg);
  return createCharacterSetToken(TokenCharacterSetKinds.property, raw, {
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

function getFlagsObj(flags: string): RegexFlags {
  if (!/^[imxDPSW]*$/.test(flags)) {
    throw new Error(`Flags "${flags}" includes unsupported value`);
  }
  const flagsObj: RegexFlags = {
    ignoreCase: false,
    dotAll: false,
    extended: false,
    digitIsAscii: false,
    posixIsAscii: false,
    spaceIsAscii: false,
    wordIsAscii: false,
  };
  for (const char of flags) {
    flagsObj[{
      i: 'ignoreCase',
      // Flag m is called `multiline` in Onig, but that has a different meaning in JS. Onig flag m
      // is equivalent to JS flag s
      m: 'dotAll',
      // Flag x is fully handled during tokenization
      x: 'extended',
      // Flags D, P, S, W are currently only supported as top-level flags
      D: 'digitIsAscii',
      P: 'posixIsAscii',
      S: 'spaceIsAscii',
      W: 'wordIsAscii',
    }[char] as keyof RegexFlags] = true;
  }
  return flagsObj;
}

// - Unenclosed `\xNN` above 0x7F is handled elsewhere as a UTF-8 encoded byte sequence
// - Enclosed `\x{}` with value above 0x10FFFF is allowed here; handled in the parser
function getValidatedHexCharCode(raw: string): number {
  // Note: Onig (v6.9.8 tested) has a bug where bare `\u` and `\x` are identity escapes if they
  // appear at the very end of the pattern, so e.g. `\u` matches `u`, but `\u0`, `\u.`, and `[\u]`
  // are all errors, and `\x.` and `[\x]` aren't errors but instead the `\x` is equivalent to `\0`.
  // Don't emulate these bugs (see <github.com/slevithan/oniguruma-to-es/issues/21>), and just
  // treat these cases as errors. Also, Onig treats incomplete `\x{` (with the brace and not
  // immediately followed by a hex digit) as an identity escape, so e.g. `\x{` matches `x{` and
  // `^\x{,2}$` matches `xx`, but `\x{2,}` and `\x{0,2}` are errors. Don't implement this pointless
  // ambiguity; just treat incomplete `\x{` as an error
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
      value = m.codePointAt(0)!;
    }
    tokens.push(createCharacterToken(value, (i === 0 ? '\\' : '') + m));
  }
  return tokens;
}

export {
  tokenize,
  TokenCharacterSetKinds,
  TokenDirectiveKinds,
  TokenGroupKinds,
  TokenQuantifierKinds,
  TokenTypes,
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
  type FlagGroupSwitches,
  type GroupCloseToken,
  type GroupOpenToken,
  type QuantifierToken,
  type RegexFlags,
  type SubroutineToken,
  type Token,
};

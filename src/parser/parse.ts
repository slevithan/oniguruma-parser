import {TokenCharacterSetKinds, TokenDirectiveKinds, TokenGroupKinds, tokenize, TokenQuantifierKinds, TokenTypes} from '../tokenizer/tokenize.js';
import type {FlagGroupModifiers, RegexFlags, Token} from '../tokenizer/tokenize.js';
import {getOrInsert, PosixClassNames, r, throwIfNot} from '../utils.js';

const NodeTypes = {
  AbsentFunction: 'AbsentFunction',
  Alternative: 'Alternative',
  Assertion: 'Assertion',
  Backreference: 'Backreference',
  CapturingGroup: 'CapturingGroup',
  Character: 'Character',
  CharacterClass: 'CharacterClass',
  CharacterClassRange: 'CharacterClassRange',
  CharacterSet: 'CharacterSet',
  Directive: 'Directive',
  Flags: 'Flags',
  Group: 'Group',
  LookaroundAssertion: 'LookaroundAssertion',
  Pattern: 'Pattern',
  Quantifier: 'Quantifier',
  Regex: 'Regex',
  Subroutine: 'Subroutine',
  // Type `Recursion` is used only by the `oniguruma-to-es` transformer for Regex+ ASTs
  // [TODO] Refactor to remove this type: <github.com/slevithan/oniguruma-parser/issues/3>
  Recursion: 'Recursion',
} as const;

type NodeType = Node['type'];
type OnigurumaAst = RegexNode;

// Watch out for the DOM `Node` interface!
type Node =
  AbsentFunctionNode |
  AlternativeNode |
  AssertionNode |
  BackreferenceNode |
  CapturingGroupNode |
  CharacterNode |
  CharacterClassNode |
  CharacterClassRangeNode |
  CharacterSetNode |
  DirectiveNode |
  FlagsNode |
  GroupNode |
  LookaroundAssertionNode |
  PatternNode |
  QuantifierNode |
  RegexNode |
  SubroutineNode;

type AlternativeContainerNode =
  AbsentFunctionNode |
  CapturingGroupNode |
  GroupNode |
  LookaroundAssertionNode |
  PatternNode;

type AlternativeElementNode =
  AbsentFunctionNode |
  AssertionNode |
  BackreferenceNode |
  CapturingGroupNode |
  CharacterNode |
  CharacterClassNode |
  CharacterSetNode |
  DirectiveNode |
  GroupNode |
  LookaroundAssertionNode |
  QuantifierNode |
  SubroutineNode;

type CharacterClassElementNode =
  CharacterNode |
  CharacterClassNode |
  CharacterClassRangeNode |
  CharacterSetNode;

type QuantifiableNode =
  AbsentFunctionNode |
  BackreferenceNode |
  CapturingGroupNode |
  CharacterNode |
  CharacterClassNode |
  CharacterSetNode |
  GroupNode |
  QuantifierNode |
  SubroutineNode;

// See <github.com/slevithan/oniguruma-to-es/issues/13>
const NodeAbsentFunctionKinds = {
  repeater: 'repeater',
} as const;

const NodeAssertionKinds = {
  grapheme_boundary: 'grapheme_boundary',
  line_end: 'line_end',
  line_start: 'line_start',
  search_start: 'search_start',
  string_end: 'string_end',
  string_end_newline: 'string_end_newline',
  string_start: 'string_start',
  word_boundary: 'word_boundary',
} as const;

const NodeCharacterClassKinds = {
  union: 'union',
  intersection: 'intersection',
} as const;

// Identical values
const NodeCharacterSetKinds = TokenCharacterSetKinds;
const NodeDirectiveKinds = TokenDirectiveKinds;
const NodeQuantifierKinds = TokenQuantifierKinds;

const NodeLookaroundAssertionKinds = {
  lookahead: 'lookahead',
  lookbehind: 'lookbehind',
} as const;

type UnicodePropertyMap = Map<string, string>;

type Walk = (parent: Node, state: State) => Node;

type Context = {
  capturingGroups: Array<CapturingGroupNode>;
  current: number;
  hasNumberedRef: boolean;
  namedGroupsByName: Map<string, Array<CapturingGroupNode>>;
  normalizeUnknownPropertyNames: boolean;
  parent: Node;
  skipBackrefValidation: boolean;
  skipLookbehindValidation: boolean;
  skipPropertyNameValidation: boolean;
  subroutines: Array<SubroutineNode>;
  token: Token;
  tokens: Array<Token>;
  unicodePropertyMap: UnicodePropertyMap | null;
  walk: Walk;
};

type State = {
  isCheckingRangeEnd?: boolean;
  isInAbsentFunction?: boolean;
  isInLookbehind?: boolean;
  isInNegLookbehind?: boolean;
};

type ParserOptions = {
  flags?: string;
  normalizeUnknownPropertyNames?: boolean;
  rules?: {
    captureGroup?: boolean;
    singleline?: boolean;
  };
  skipBackrefValidation?: boolean;
  skipLookbehindValidation?: boolean;
  skipPropertyNameValidation?: boolean;
  unicodePropertyMap?: UnicodePropertyMap | null;
};

function parse(pattern: string, options: ParserOptions = {}): OnigurumaAst {
  const opts: Required<ParserOptions> = {
    flags: '',
    normalizeUnknownPropertyNames: false,
    skipBackrefValidation: false,
    skipLookbehindValidation: false,
    skipPropertyNameValidation: false,
    // `toOnigurumaAst` provides `OnigUnicodePropertyMap`, but it can be custom or `null`
    unicodePropertyMap: null,
    ...options,
    rules: {
      captureGroup: false, // `ONIG_OPTION_CAPTURE_GROUP`
      singleline: false, // `ONIG_OPTION_SINGLELINE`
      ...options.rules,
    },
  };
  const tokenized = tokenize(pattern, {
    // Limit to the tokenizer's options
    flags: opts.flags,
    rules: {
      captureGroup: opts.rules.captureGroup,
      singleline: opts.rules.singleline,
    },
  });
  const walk: Walk = (parent, state) => {
    const token = tokenized.tokens[context.current];
    context.parent = parent;
    context.token = token;
    // Advance for the next iteration
    context.current++;
    switch (token.type) {
      case TokenTypes.Alternator:
        // Top-level only; groups handle their own alternators
        return createAlternative();
      case TokenTypes.Assertion:
        return createAssertionFromToken(token);
      case TokenTypes.Backreference:
        return parseBackreference(context);
      case TokenTypes.Character:
        return createCharacter(token.value as number, {useLastValid: !!state.isCheckingRangeEnd});
      case TokenTypes.CharacterClassHyphen:
        return parseCharacterClassHyphen(context, state);
      case TokenTypes.CharacterClassOpen:
        return parseCharacterClassOpen(context, state);
      case TokenTypes.CharacterSet:
        return parseCharacterSet(context);
      case TokenTypes.Directive:
        return createDirectiveFromToken(token);
      case TokenTypes.GroupOpen:
        return parseGroupOpen(context, state);
      case TokenTypes.Quantifier:
        return parseQuantifier(context);
      case TokenTypes.Subroutine:
        return parseSubroutine(context);
      default:
        throw new Error(`Unexpected token type "${token.type}"`);
    }
  }
  const context: Context = {
    capturingGroups: [],
    current: 0,
    hasNumberedRef: false,
    namedGroupsByName: new Map(),
    normalizeUnknownPropertyNames: opts.normalizeUnknownPropertyNames,
    parent: null!, // Assigned by `walk`
    skipBackrefValidation: opts.skipBackrefValidation,
    skipLookbehindValidation: opts.skipLookbehindValidation,
    skipPropertyNameValidation: opts.skipPropertyNameValidation,
    subroutines: [],
    token: null!, // Assigned by `walk`
    tokens: tokenized.tokens,
    unicodePropertyMap: opts.unicodePropertyMap,
    walk,
  };

  // ## AST construction from tokens
  const ast = createRegex(createPattern(), createFlags(tokenized.flags));
  let top = ast.pattern.alternatives[0];
  while (context.current < tokenized.tokens.length) {
    const node = walk(top, {});
    if (node.type === NodeTypes.Alternative) {
      ast.pattern.alternatives.push(node);
      top = node;
    } else {
      top.elements.push(node as AlternativeElementNode);
    }
  }

  // ## Validation that requires knowledge about the complete pattern
  // `context` updated by the preceding `walk` loop
  const {capturingGroups, hasNumberedRef, namedGroupsByName, subroutines} = context;
  if (hasNumberedRef && namedGroupsByName.size && !opts.rules.captureGroup) {
    throw new Error('Numbered backref/subroutine not allowed when using named capture');
  }
  for (const {ref} of subroutines) {
    if (typeof ref === 'number') {
      // Relative nums are already resolved
      if (ref > capturingGroups.length) {
        throw new Error(`Subroutine uses a group number that's not defined`);
      }
    } else if (!namedGroupsByName.has(ref)) {
      throw new Error(r`Subroutine uses a group name that's not defined "\g<${ref}>"`);
    } else if (namedGroupsByName.get(ref)!.length > 1) {
      throw new Error(r`Subroutine uses a duplicate group name "\g<${ref}>"`);
    }
  }

  return ast;
}

// Supported (if the backref appears to the right of the reffed capture's opening paren):
// - `\k<name>`, `\k'name'`
// - When named capture not used:
//   - `\n`, `\nn`, `\nnn`
//   - `\k<n>`, `\k'n'
//   - `\k<-n>`, `\k'-n'`
// Unsupported:
// - `\k<+n>`, `\k'+n'` - Note that, Unlike Oniguruma, Onigmo doesn't support this as special
//   syntax and therefore considers it a valid group name.
// - Backref with recursion level (with num or name): `\k<n+level>`, `\k<n-level>`, etc.
//   (Onigmo also supports `\k<-n+level>`, `\k<-n-level>`, etc.)
// Backrefs in Onig use multiplexing for duplicate group names (the rules can be complicated when
// overlapping with subroutines), but a `Backreference`'s simple `ref` prop doesn't capture these
// details so multiplexed ref pointers need to be derived when working with the AST
function parseBackreference(context: Context): BackreferenceNode {
  const {raw} = context.token;
  const hasKWrapper = /^\\k[<']/.test(raw);
  const ref = hasKWrapper ? raw.slice(3, -1) : raw.slice(1);
  const fromNum = (num: number, isRelative = false) => {
    const numCapturesToLeft = context.capturingGroups.length;
    let orphan = false;
    // Note: It's not an error for numbered backrefs to come before their referenced group in Onig,
    // but it's currently an error in this library.
    // - Most such placements are mistakes and can never match, due to Onig's behavior for backrefs
    //   to nonparticipating groups.
    //   - The edge cases where they're matchable rely on rules for backref resetting within
    //     quantified groups that are different in JS (thus not emulatable in `oniguruma-to-es`).
    // - Erroring matches the correct behavior of named backrefs.
    // - For unenclosed backrefs, this only affects `\1`-`\9` since it's not a backref in the first
    //   place if using `\10` or higher and not as many capturing groups are defined to the left
    //   (it's an octal or identity escape).
    // [TODO] Ideally this would be refactored to include the backref in the AST when it's not an
    // error in Onig (due to the reffed group being defined to the right), and the error handling
    // would move to the `oniguruma-to-es` transformer
    if (num > numCapturesToLeft) {
      // [WARNING] Skipping the error breaks assumptions and might create edge case issues, since
      // backrefs are required to come after their captures; unfortunately this option is needed
      // for TextMate grammars
      if (context.skipBackrefValidation) {
        orphan = true;
      } else {
        throw new Error(`Not enough capturing groups defined to the left "${raw}"`);
      }
    }
    context.hasNumberedRef = true;
    return createBackreference(isRelative ? numCapturesToLeft + 1 - num : num, {orphan});
  };
  if (hasKWrapper) {
    const numberedRef = /^(?<sign>-?)0*(?<num>[1-9]\d*)$/.exec(ref);
    if (numberedRef) {
      return fromNum(+numberedRef.groups!.num, !!numberedRef.groups!.sign);
    }
    // Invalid in a backref name even when valid in a group name
    if (/[-+]/.test(ref)) {
      throw new Error(`Invalid backref name "${raw}"`);
    }
    if (!context.namedGroupsByName.has(ref)) {
      throw new Error(`Group name not defined to the left "${raw}"`);
    }
    return createBackreference(ref);
  }
  return fromNum(+ref);
}

function parseCharacterClassHyphen(context: Context, state: State): CharacterNode | CharacterClassRangeNode {
  const {parent, tokens, walk} = context as Context & {parent: CharacterClassNode};
  const prevSiblingNode = parent.elements.at(-1);
  const nextToken = tokens[context.current];
  if (
    !state.isCheckingRangeEnd &&
    prevSiblingNode &&
    prevSiblingNode.type !== NodeTypes.CharacterClass &&
    prevSiblingNode.type !== NodeTypes.CharacterClassRange &&
    nextToken &&
    nextToken.type !== TokenTypes.CharacterClassOpen &&
    nextToken.type !== TokenTypes.CharacterClassClose &&
    nextToken.type !== TokenTypes.CharacterClassIntersector
  ) {
    const nextNode = walk(parent, {
      ...state,
      isCheckingRangeEnd: true,
    });
    if (prevSiblingNode.type === NodeTypes.Character && nextNode.type === NodeTypes.Character) {
      parent.elements.pop();
      return createCharacterClassRange(prevSiblingNode, nextNode);
    }
    throw new Error('Invalid character class range');
  }
  // Literal hyphen
  return createCharacter(45);
}

function parseCharacterClassOpen(context: Context, state: State): CharacterClassNode {
  const {token, tokens, walk} = context;
  const firstClassToken = tokens[context.current];
  const intersections = [createCharacterClass()];
  let nextToken = throwIfUnclosedCharacterClass(firstClassToken);
  while (nextToken.type !== TokenTypes.CharacterClassClose) {
    if (nextToken.type === TokenTypes.CharacterClassIntersector) {
      intersections.push(createCharacterClass());
      // Skip the intersector
      context.current++;
    } else {
      const cc = intersections.at(-1)!; // Always at least one
      cc.elements.push(walk(cc, state) as CharacterClassElementNode);
    }
    nextToken = throwIfUnclosedCharacterClass(tokens[context.current], firstClassToken);
  }
  const node = createCharacterClass({negate: token.negate});
  if (intersections.length === 1) {
    node.elements = intersections[0].elements;
  } else {
    node.kind = NodeCharacterClassKinds.intersection;
    node.elements = intersections.map(cc => cc.elements.length === 1 ? cc.elements[0] : cc);
  }
  // Skip the closing square bracket
  context.current++;
  return node;
}

function parseCharacterSet({token, normalizeUnknownPropertyNames, skipPropertyNameValidation, unicodePropertyMap}: Context): CharacterSetNode {
  let {kind, negate, value} = token as Token & {kind: CharacterSetNode['kind']; value: string};
  if (kind === TokenCharacterSetKinds.property) {
    const normalized = slug(value);
    // Don't treat as POSIX if it's in the provided list of Unicode property names
    if (PosixClassNames.has(normalized) && !unicodePropertyMap?.has(normalized)) {
      kind = TokenCharacterSetKinds.posix;
      value = normalized;
    } else {
      return createUnicodeProperty(value, {
        negate,
        normalizeUnknownPropertyNames,
        skipPropertyNameValidation,
        unicodePropertyMap,
      });
    }
  }
  if (kind === TokenCharacterSetKinds.posix) {
    return createPosixClass(value, {negate});
  }
  return createCharacterSet(kind, {negate});
}

function parseGroupOpen(context: Context, state: State): AbsentFunctionNode | CapturingGroupNode | GroupNode | LookaroundAssertionNode {
  const {token, tokens, capturingGroups, namedGroupsByName, skipLookbehindValidation, walk} = context;
  let node = createByGroupKind(token);
  const isThisAbsentFunction = node.type === NodeTypes.AbsentFunction;
  const isThisLookbehind = isLookbehind(node);
  const isThisNegLookbehind = isThisLookbehind && node.negate;
  // Track capturing group details for backrefs and subroutines (before parsing the group's
  // contents so nested groups with the same name are tracked in order)
  if (node.type === NodeTypes.CapturingGroup) {
    capturingGroups.push(node);
    if (node.name) {
      getOrInsert(namedGroupsByName, node.name, []).push(node);
    }
  }
  // Don't allow nested absent functions
  if (isThisAbsentFunction && state.isInAbsentFunction) {
    // Is officially unsupported in Onig but doesn't throw, gives strange results
    throw new Error('Nested absent function not supported by Oniguruma');
  }
  let nextToken = throwIfUnclosedGroup(tokens[context.current]);
  while (nextToken.type !== TokenTypes.GroupClose) {
    if (nextToken.type === TokenTypes.Alternator) {
      node.alternatives.push(createAlternative());
      // Skip the alternator
      context.current++;
    } else {
      const alt = node.alternatives.at(-1)!; // Always at least one
      const child = walk(alt, {
        ...state,
        isInAbsentFunction: state.isInAbsentFunction || isThisAbsentFunction,
        isInLookbehind: state.isInLookbehind || isThisLookbehind,
        isInNegLookbehind: state.isInNegLookbehind || isThisNegLookbehind,
      }) as AlternativeElementNode;
      alt.elements.push(child);
      // Centralized validation of lookbehind contents
      if ((isThisLookbehind || state.isInLookbehind) && !skipLookbehindValidation) {
        // JS supports all features within lookbehind, but Onig doesn't. Absent functions of form
        // `(?~|)` and `(?~|…)` are also invalid in lookbehind (the `(?~…)` and `(?~|…|…)` forms
        // are allowed), but all forms with `(?~|` throw since they aren't yet supported
        const msg = 'Lookbehind includes a pattern not allowed by Oniguruma';
        if (isThisNegLookbehind || state.isInNegLookbehind) {
          // - Invalid: `(?=…)`, `(?!…)`, capturing groups
          // - Valid: `(?<=…)`, `(?<!…)`
          if (isLookahead(child) || child.type === NodeTypes.CapturingGroup) {
            throw new Error(msg);
          }
        } else {
          // - Invalid: `(?=…)`, `(?!…)`, `(?<!…)`
          // - Valid: `(?<=…)`, capturing groups
          if (isLookahead(child) || (isLookbehind(child) && child.negate)) {
            throw new Error(msg);
          }
        }
      }
    }
    nextToken = throwIfUnclosedGroup(tokens[context.current]);
  }
  // Skip the closing parenthesis
  context.current++;
  return node;
}

function parseQuantifier(context: Context): QuantifierNode {
  const {token, parent} = context as Context & {parent: AlternativeNode};
  const {min, max, kind} = token;
  const quantifiedNode = parent.elements.at(-1);
  if (
    !quantifiedNode ||
    // TODO: `!quantifiableTypes.has(quantifiedNode.type)`
    quantifiedNode.type === NodeTypes.Assertion ||
    quantifiedNode.type === NodeTypes.Directive ||
    quantifiedNode.type === NodeTypes.LookaroundAssertion
  ) {
    throw new Error(`Quantifier requires a repeatable token`);
  }
  const node = createQuantifier(
    quantifiedNode,
    min!,
    max!,
    throwIfNot(NodeQuantifierKinds[kind as keyof typeof TokenQuantifierKinds], `Unexpected quantifier kind "${kind}"`)
  );
  parent.elements.pop();
  return node;
}

// Onig subroutine behavior:
// - Subroutines can appear before the groups they reference; ex: `\g<1>(a)` is valid.
// - Multiple subroutines can reference the same group.
// - Subroutines can reference groups that themselves contain subroutines, followed to any depth.
// - Subroutines can be used recursively, and `\g<0>` recursively references the whole pattern.
// - Subroutines can use relative references (backward or forward); ex: `\g<+1>(.)\g<-1>`.
// - Subroutines don't get their own capturing group numbers; ex: `(.)\g<1>\2` is invalid.
// - Subroutines use the flags that apply to their referenced group, so e.g.
//   `(?-i)(?<a>a)(?i)\g<a>` is fully case sensitive.
// - Differences from PCRE/Perl/Regex+ subroutines:
//   - Subroutines can't reference duplicate group names (though duplicate names are valid if no
//     subroutines reference them).
//   - Subroutines can't use absolute or relative numbers if named capture is used anywhere.
//   - Named backrefs must be to the right of their group definition, so the backref in
//     `\g<a>\k<a>(?<a>)` is invalid (not directly related to subroutines).
//   - Subroutines don't restore capturing group match values (for backrefs) upon exit, so e.g.
//     `(?<a>(?<b>[ab]))\g<a>\k<b>` matches `abb` but not `aba`; same for numbered.
// The interaction of backref multiplexing (an Onig-specific feature) and subroutines is complex:
// - Only the most recent value matched by a capturing group and its subroutines is considered for
//   backref multiplexing, and this also applies to capturing groups nested within a group that's
//   referenced by a subroutine.
// - Although a subroutine can't reference a group with a duplicate name, it can reference a group
//   with a nested capture whose name is duplicated (e.g. outside of the referenced group).
//   - These duplicate names can then multiplex; but only the most recent value matched from within
//     the outer group (or the subroutines that reference it) is available for multiplexing.
//   - Ex: With `(?<a>(?<b>[123]))\g<a>\g<a>(?<b>0)\k<b>`, the backref `\k<b>` can only match `0`
//     or whatever was matched by the most recently matched subroutine. If you took out `(?<b>0)`,
//     no multiplexing would occur.
function parseSubroutine(context: Context): SubroutineNode {
  const {token, capturingGroups, subroutines} = context;
  let ref: (string | number) = token.raw.slice(3, -1);
  const numberedRef = /^(?<sign>[-+]?)0*(?<num>[1-9]\d*)$/.exec(ref);
  if (numberedRef) {
    const num = +numberedRef.groups!.num;
    const numCapturesToLeft = capturingGroups.length;
    context.hasNumberedRef = true;
    ref = {
      '': num,
      '+': numCapturesToLeft + num,
      '-': numCapturesToLeft + 1 - num,
    }[numberedRef.groups!.sign]!;
    if (ref < 1) {
      throw new Error('Invalid subroutine number');
    }
  // Special case for full-pattern recursion; can't be `+0`, `-0`, `00`, etc.
  } else if (ref === '0') {
    ref = 0;
  }
  const node = createSubroutine(ref);
  subroutines.push(node);
  return node;
}

type AbsentFunctionNode = {
  type: 'AbsentFunction';
  kind: keyof typeof NodeAbsentFunctionKinds;
  alternatives: Array<AlternativeNode>;
};
function createAbsentFunction(kind: keyof typeof NodeAbsentFunctionKinds): AbsentFunctionNode {
  if (kind !== NodeAbsentFunctionKinds.repeater) {
    throw new Error(`Unexpected absent function kind "${kind}"`);
  }
  return {
    type: NodeTypes.AbsentFunction,
    kind,
    alternatives: [createAlternative()],
  };
}

type AlternativeNode = {
  type: 'Alternative';
  elements: Array<AlternativeElementNode>;
};
function createAlternative(): AlternativeNode {
  return {
    type: NodeTypes.Alternative,
    elements: [],
  };
}

type AssertionNode = {
  type: 'Assertion';
  kind: keyof typeof NodeAssertionKinds;
  negate?: boolean;
};
function createAssertion(kind: keyof typeof NodeAssertionKinds, options: {
  negate?: boolean;
}): AssertionNode {
  const node: AssertionNode = {
    type: NodeTypes.Assertion,
    kind,
  };
  if (kind === NodeAssertionKinds.word_boundary || kind === NodeAssertionKinds.grapheme_boundary) {
    node.negate = !!options?.negate;
  }
  return node;
}

function createAssertionFromToken(token: Token): AssertionNode {
  const {kind} = token as Token & {kind: string};
  return createAssertion(
    throwIfNot({
      '^': NodeAssertionKinds.line_start,
      '$': NodeAssertionKinds.line_end,
      '\\A': NodeAssertionKinds.string_start,
      '\\b': NodeAssertionKinds.word_boundary,
      '\\B': NodeAssertionKinds.word_boundary,
      '\\G': NodeAssertionKinds.search_start,
      '\\y': NodeAssertionKinds.grapheme_boundary,
      '\\Y': NodeAssertionKinds.grapheme_boundary,
      '\\z': NodeAssertionKinds.string_end,
      '\\Z': NodeAssertionKinds.string_end_newline,
    }[kind]!, `Unexpected assertion kind "${kind}"`),
    {negate: kind === r`\B` || kind === r`\Y`}
  );
}

type BackreferenceNode = {
  type: 'Backreference';
  ref: string | number;
  orphan?: boolean;
};
function createBackreference(ref: string | number, options?: {
  orphan?: boolean;
}): BackreferenceNode {
  const orphan = !!options?.orphan;
  return {
    type: NodeTypes.Backreference,
    ref,
    ...(orphan && {orphan}),
  };
}

function createByGroupKind({flags, kind, name, negate, number}: Token): AbsentFunctionNode | CapturingGroupNode | GroupNode | LookaroundAssertionNode {
  switch (kind) {
    case TokenGroupKinds.absent_repeater:
      return createAbsentFunction(NodeAbsentFunctionKinds.repeater);
    case TokenGroupKinds.atomic:
      return createGroup({atomic: true});
    case TokenGroupKinds.capturing:
      return createCapturingGroup(number as number, name as string);
    case TokenGroupKinds.group:
      return createGroup({flags});
    case TokenGroupKinds.lookahead:
    case TokenGroupKinds.lookbehind:
      return createLookaroundAssertion({
        behind: kind === TokenGroupKinds.lookbehind,
        negate,
      });
    default:
      throw new Error(`Unexpected group kind "${kind}"`);
  }
}

type CapturingGroupNode = {
  type: 'CapturingGroup';
  kind?: never;
  number: number;
  name?: string;
  alternatives: Array<AlternativeNode>;
};
function createCapturingGroup(number: number, name?: string): CapturingGroupNode {
  const hasName = name !== undefined;
  if (hasName && !isValidGroupName(name)) {
    throw new Error(`Group name "${name}" invalid in Oniguruma`);
  }
  return {
    type: NodeTypes.CapturingGroup,
    number,
    ...(hasName && {name}),
    alternatives: [createAlternative()],
  };
}

type CharacterNode = {
  type: 'Character';
  value: number;
};
function createCharacter(charCode: number, options?: {
  useLastValid?: boolean;
}): CharacterNode {
  const opts = {
    useLastValid: false,
    ...options,
  };
  if (charCode > 0x10FFFF) {
    const hex = charCode.toString(16);
    if (opts.useLastValid) {
      charCode = 0x10FFFF;
    } else if (charCode > 0x13FFFF) {
      throw new Error(`Invalid code point out of range "\\x{${hex}}"`);
    } else {
      throw new Error(`Invalid code point out of range in JS "\\x{${hex}}"`);
    }
  }
  return {
    type: NodeTypes.Character,
    value: charCode,
  };
}

type CharacterClassNode = {
  type: 'CharacterClass';
  kind: keyof typeof NodeCharacterClassKinds;
  negate: boolean;
  elements: Array<CharacterClassElementNode>;
};
function createCharacterClass(options?: {
  kind?: keyof typeof NodeCharacterClassKinds;
  negate?: boolean;
}): CharacterClassNode {
  const opts = {
    kind: NodeCharacterClassKinds.union,
    negate: false,
    ...options,
  };
  return {
    type: NodeTypes.CharacterClass,
    kind: opts.kind,
    negate: opts.negate,
    elements: [],
  };
}

type CharacterClassRangeNode = {
  type: 'CharacterClassRange';
  min: CharacterNode;
  max: CharacterNode;
};
function createCharacterClassRange(min: CharacterNode, max: CharacterNode): CharacterClassRangeNode {
  if (max.value < min.value) {
    throw new Error('Character class range out of order');
  }
  return {
    type: NodeTypes.CharacterClassRange,
    min,
    max,
  };
}

type NamedCharacterSetNode = {
  type: 'CharacterSet';
  kind: 'posix' | 'property';
  value: string;
  negate: boolean;
  variableLength?: never;
};
type UnnamedCharacterSetNode = {
  type: 'CharacterSet';
  kind: keyof Omit<typeof NodeCharacterSetKinds, 'posix' | 'property'>;
  value?: never;
  negate?: boolean;
  variableLength?: boolean;
};
type CharacterSetNode = NamedCharacterSetNode | UnnamedCharacterSetNode;
function createCharacterSet(kind: UnnamedCharacterSetNode['kind'], options?: {
  negate?: boolean;
}): UnnamedCharacterSetNode {
  const negate = !!options?.negate;
  const node: UnnamedCharacterSetNode = {
    type: NodeTypes.CharacterSet,
    kind: throwIfNot(NodeCharacterSetKinds[kind], `Unexpected character set kind "${kind}"`),
  };
  if (
    kind === TokenCharacterSetKinds.digit ||
    kind === TokenCharacterSetKinds.hex ||
    kind === TokenCharacterSetKinds.newline ||
    kind === TokenCharacterSetKinds.space ||
    kind === TokenCharacterSetKinds.word
  ) {
    node.negate = negate;
  }
  if (
    kind === TokenCharacterSetKinds.grapheme ||
    (kind === TokenCharacterSetKinds.newline && !negate)
  ) {
    node.variableLength = true;
  }
  return node;
}

type DirectiveNode = {
  type: 'Directive';
  kind: keyof typeof NodeDirectiveKinds;
  flags?: FlagGroupModifiers;
};
function createDirective(kind: 'flags', options: {flags: FlagGroupModifiers}): DirectiveNode;
function createDirective(kind: 'keep'): DirectiveNode;
function createDirective(
  kind: keyof typeof NodeDirectiveKinds,
  options: {flags?: FlagGroupModifiers} = {}
): DirectiveNode {
  const node: DirectiveNode = {
    type: NodeTypes.Directive,
    kind,
  };
  // Can't optimize by simply creating a `Group` with a `flags` prop and wrapping the remainder of
  // the open group or pattern in it, because the flag modifier's effect might extend across
  // alternation. Ex: `a(?i)b|c` is equivalent to `a(?i:b)|(?i:c)`, not `a(?i:b|c)`
  if (kind === NodeDirectiveKinds.flags) {
    node.flags = throwIfNot(options.flags);
  }
  return node;
}

function createDirectiveFromToken(token: Token): DirectiveNode {
  const {kind, flags} = token as Token & {kind: keyof typeof TokenDirectiveKinds};
  throwIfNot(NodeDirectiveKinds[kind], `Unexpected directive kind "${kind}"`);
  return kind === TokenDirectiveKinds.flags ?
    createDirective(kind, {flags: flags!}) :
    createDirective(kind);
}

type FlagsNode = {
  type: 'Flags';
} & RegexFlags;
function createFlags(flags: RegexFlags): FlagsNode {
  return {
    type: NodeTypes.Flags,
    ...flags,
  };
}

type GroupNode = {
  type: 'Group';
  kind?: never;
  atomic?: boolean;
  flags?: FlagGroupModifiers;
  alternatives: Array<AlternativeNode>;
};
function createGroup(options?: {
  atomic?: boolean;
  flags?: FlagGroupModifiers;
}): GroupNode {
  const atomic = options?.atomic;
  const flags = options?.flags;
  return {
    type: NodeTypes.Group,
    ...(atomic && {atomic}),
    ...(flags && {flags}),
    alternatives: [createAlternative()],
  };
}

type LookaroundAssertionNode = {
  type: 'LookaroundAssertion';
  kind: keyof typeof NodeLookaroundAssertionKinds;
  negate: boolean;
  alternatives: Array<AlternativeNode>;
};
function createLookaroundAssertion(options?: {
  behind?: boolean;
  negate?: boolean;
}): LookaroundAssertionNode {
  const opts = {
    behind: false,
    negate: false,
    ...options,
  };
  return {
    type: NodeTypes.LookaroundAssertion,
    kind: opts.behind ? NodeLookaroundAssertionKinds.lookbehind : NodeLookaroundAssertionKinds.lookahead,
    negate: opts.negate,
    alternatives: [createAlternative()],
  };
}

type PatternNode = {
  type: 'Pattern';
  alternatives: Array<AlternativeNode>;
};
function createPattern(): PatternNode {
  return {
    type: NodeTypes.Pattern,
    alternatives: [createAlternative()],
  };
}

function createPosixClass(name: string, options?: {
  negate?: boolean;
}): NamedCharacterSetNode & {kind: 'posix'} {
  const negate = !!options?.negate;
  if (!PosixClassNames.has(name)) {
    throw new Error(`Invalid POSIX class "${name}"`);
  }
  return {
    type: NodeTypes.CharacterSet,
    kind: NodeCharacterSetKinds.posix,
    value: name,
    negate,
  };
}

type QuantifierNode = {
  type: 'Quantifier';
  min: number;
  max: number;
  kind: keyof typeof NodeQuantifierKinds;
  element: QuantifiableNode;
};
function createQuantifier(element: QuantifiableNode, min: number, max: number, kind: keyof typeof NodeQuantifierKinds = NodeQuantifierKinds.greedy): QuantifierNode {
  const node = {
    type: NodeTypes.Quantifier,
    min,
    max,
    kind,
    element,
  };
  if (max < min) {
    return {
      ...node,
      min: max,
      max: min,
      kind: NodeQuantifierKinds.possessive,
    };
  }
  return node;
}

type RegexNode = {
  type: 'Regex';
  pattern: PatternNode;
  flags: FlagsNode;
};
function createRegex(pattern: PatternNode, flags: FlagsNode): RegexNode {
  return {
    type: NodeTypes.Regex,
    pattern,
    flags,
  };
}

type SubroutineNode = {
  type: 'Subroutine';
  ref: string | number;
};
function createSubroutine(ref: string | number): SubroutineNode {
  return {
    type: NodeTypes.Subroutine,
    ref,
  };
}

type CreateUnicodePropertyOptions = {
  negate?: boolean;
  normalizeUnknownPropertyNames?: boolean;
  skipPropertyNameValidation?: boolean;
  unicodePropertyMap?: UnicodePropertyMap | null;
};
function createUnicodeProperty(name: string, options?: CreateUnicodePropertyOptions): NamedCharacterSetNode & {kind: 'property'} {
  const opts: Required<CreateUnicodePropertyOptions> = {
    negate: false,
    normalizeUnknownPropertyNames: false,
    skipPropertyNameValidation: false,
    unicodePropertyMap: null,
    ...options,
  };
  let normalized = opts.unicodePropertyMap?.get(slug(name));
  if (!normalized) {
    if (opts.normalizeUnknownPropertyNames) {
      normalized = normalizeUnicodePropertyName(name);
    // Let the name through as-is if no map provided and normalization not requested
    } else if (opts.unicodePropertyMap && !opts.skipPropertyNameValidation) {
      throw new Error(r`Invalid Unicode property "\p{${name}}"`);
    }
  }
  return {
    type: NodeTypes.CharacterSet,
    kind: NodeCharacterSetKinds.property,
    value: normalized ?? name,
    negate: opts.negate,
  };
}

function isLookahead(node: Node): node is (LookaroundAssertionNode & {kind: 'lookahead'}) {
  return node.type === NodeTypes.LookaroundAssertion && node.kind === NodeLookaroundAssertionKinds.lookahead;
}

function isLookbehind(node: Node): node is (LookaroundAssertionNode & {kind: 'lookbehind'}) {
  return node.type === NodeTypes.LookaroundAssertion && node.kind === NodeLookaroundAssertionKinds.lookbehind;
}

function isValidGroupName(name: string): boolean {
  // Note that backrefs and subroutines might contextually use `-` and `+` to indicate relative
  // index or recursion level
  return /^[\p{Alpha}\p{Pc}][^)]*$/u.test(name);
}

function normalizeUnicodePropertyName(name: string): string {
  // In Onig, Unicode property names ignore case, spaces, hyphens, and underscores. Use best effort
  // to reformat the name to follow official values (covers a lot, but isn't able to map for all
  // possible formatting differences)
  return name.
    trim().
    replace(/[- _]+/g, '_').
    replace(/[A-Z][a-z]+(?=[A-Z])/g, '$&_'). // `PropertyName` to `Property_Name`
    replace(/[A-Za-z]+/g, m => m[0].toUpperCase() + m.slice(1).toLowerCase());
}

/**
Generates a Unicode property lookup name: lowercase, without spaces, hyphens, or underscores.
*/
function slug(name: string): string {
  return name.replace(/[- _]+/g, '').toLowerCase();
}

function throwIfUnclosedCharacterClass(token: Token, firstClassToken?: Token): Token {
  return throwIfNot(
    token,
    // Easier to understand error when applicable
    `${firstClassToken?.value === 93 ? 'Empty' : 'Unclosed'} character class`
  );
}

function throwIfUnclosedGroup(token: Token): Token {
  return throwIfNot(token, 'Unclosed group');
}

export {
  createAbsentFunction,
  createAlternative,
  createAssertion,
  createBackreference,
  createCapturingGroup,
  createCharacter,
  createCharacterClass,
  createCharacterClassRange,
  createCharacterSet,
  createDirective,
  createFlags,
  createGroup,
  createLookaroundAssertion,
  createPattern,
  createPosixClass,
  createQuantifier,
  createRegex,
  createSubroutine,
  createUnicodeProperty,
  NodeAbsentFunctionKinds,
  NodeAssertionKinds,
  NodeCharacterClassKinds,
  NodeCharacterSetKinds,
  NodeDirectiveKinds,
  NodeLookaroundAssertionKinds,
  NodeTypes,
  NodeQuantifierKinds,
  parse,
  slug,
  type AbsentFunctionNode,
  type AlternativeNode,
  type AlternativeContainerNode,
  type AlternativeElementNode,
  type AssertionNode,
  type BackreferenceNode,
  type CapturingGroupNode,
  type CharacterClassElementNode,
  type CharacterClassNode,
  type CharacterClassRangeNode,
  type CharacterNode,
  type CharacterSetNode,
  type DirectiveNode,
  type FlagsNode,
  type GroupNode,
  type LookaroundAssertionNode,
  type Node,
  type NodeType,
  type OnigurumaAst,
  type PatternNode,
  type QuantifiableNode,
  type QuantifierNode,
  type RegexNode,
  type SubroutineNode,
  type UnicodePropertyMap,
};

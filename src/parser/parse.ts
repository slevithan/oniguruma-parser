import {tokenize} from '../tokenizer/tokenize.js';
import type {AssertionToken, BackreferenceToken, CharacterClassHyphenToken, CharacterClassOpenToken, CharacterSetToken, FlagGroupModifiers, FlagProperties, GroupOpenToken, NamedCalloutToken, QuantifierToken, SubroutineToken, Token, TokenCharacterSetKind, TokenDirectiveKind, TokenNamedCalloutKind, TokenQuantifierKind} from '../tokenizer/tokenize.js';
import {getOrInsert, PosixClassNames, r, throwIfNullable} from '../utils.js';

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
  NamedCalloutNode |
  PatternNode |
  QuantifierNode |
  RegexNode |
  SubroutineNode;

type NodeType = Node['type'];
type OnigurumaAst = RegexNode;

type ParentNode =
  AlternativeContainerNode |
  AlternativeNode |
  CharacterClassNode |
  CharacterClassRangeNode |
  QuantifierNode |
  RegexNode;

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

// TODO: Support remaining kinds; see <github.com/slevithan/oniguruma-to-es/issues/13>
type NodeAbsentFunctionKind =
  'repeater';

type NodeAssertionKind =
  'grapheme_boundary' |
  'line_end' |
  'line_start' |
  'search_start' |
  'string_end' |
  'string_end_newline' |
  'string_start' |
  'word_boundary';

type NodeCharacterClassKind =
  'union' |
  'intersection';

type NodeCharacterSetKind = TokenCharacterSetKind;

type NodeDirectiveKind = TokenDirectiveKind;

type NodeLookaroundAssertionKind =
  'lookahead' |
  'lookbehind';

type NodeNamedCalloutKind = TokenNamedCalloutKind;

type NodeQuantifierKind = TokenQuantifierKind;

type UnicodePropertyMap = Map<string, string>;

type Context = {
  capturingGroups: Array<CapturingGroupNode>;
  current: number;
  hasNumberedRef: boolean;
  namedGroupsByName: Map<string, Array<CapturingGroupNode>>;
  normalizeUnknownPropertyNames: boolean;
  parent: ParentNode;
  skipBackrefValidation: boolean;
  skipLookbehindValidation: boolean;
  skipPropertyNameValidation: boolean;
  subroutines: Array<SubroutineNode>;
  tokens: Array<Token>;
  unicodePropertyMap: UnicodePropertyMap | null;
  walk: (parent: ParentNode, state: State) => Node;
};

// Top-level `walk` calls are given empty state; nested calls can add data specific to their `walk`
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
  const walk: Context['walk'] = (parent, state) => {
    const token = tokenized.tokens[context.current];
    context.parent = parent;
    // Advance for the next iteration
    context.current++;
    switch (token.type) {
      case 'Alternator':
        // Top-level only; groups handle their own alternators
        return createAlternative();
      case 'Assertion':
        return parseAssertion(token);
      case 'Backreference':
        return parseBackreference(token, context);
      case 'Character':
        return createCharacter(token.value, {useLastValid: !!state.isCheckingRangeEnd});
      case 'CharacterClassHyphen':
        return parseCharacterClassHyphen(token, context, state);
      case 'CharacterClassOpen':
        return parseCharacterClassOpen(token, context, state);
      case 'CharacterSet':
        return parseCharacterSet(token, context);
      case 'Directive':
        return createDirective(token.kind, {flags: token.flags});
      case 'GroupOpen':
        return parseGroupOpen(token, context, state);
      case 'NamedCallout':
        return parseNamedCallout(token);
      case 'Quantifier':
        return parseQuantifier(token, context);
      case 'Subroutine':
        return parseSubroutine(token, context);
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
    tokens: tokenized.tokens,
    unicodePropertyMap: opts.unicodePropertyMap,
    walk,
  };

  // ## AST construction from tokens
  const ast = createRegex(createPattern(), createFlags(tokenized.flags));
  let top = ast.pattern.alternatives[0];
  while (context.current < tokenized.tokens.length) {
    const node = walk(top, {});
    if (node.type === 'Alternative') {
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

function parseAssertion({kind}: AssertionToken): AssertionNode {
  return createAssertion(
    throwIfNullable({
      '^': 'line_start',
      '$': 'line_end',
      '\\A': 'string_start',
      '\\b': 'word_boundary',
      '\\B': 'word_boundary',
      '\\G': 'search_start',
      '\\y': 'grapheme_boundary',
      '\\Y': 'grapheme_boundary',
      '\\z': 'string_end',
      '\\Z': 'string_end_newline',
    }[kind], `Unexpected assertion kind "${kind}"`) as NodeAssertionKind,
    {negate: kind === r`\B` || kind === r`\Y`}
  );
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
function parseBackreference({raw}: BackreferenceToken, context: Context): BackreferenceNode {
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
    // TODO: Ideally this would be refactored to include the backref in the AST when it's not an
    // error in Onig (due to the reffed group being defined to the right), and the error handling
    // would move to the `oniguruma-to-es` transformer
    if (num > numCapturesToLeft) {
      // Skipping the error breaks assumptions and might create edge case issues, since backrefs
      // are required to come after their captures; unfortunately this option is needed for
      // TextMate grammars
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

function parseCharacterClassHyphen(_: CharacterClassHyphenToken, context: Context, state: State): CharacterNode | CharacterClassRangeNode {
  const {tokens, walk} = context;
  const parent = context.parent as CharacterClassNode;
  const prevSiblingNode = parent.elements.at(-1);
  const nextToken = tokens[context.current];
  if (
    !state.isCheckingRangeEnd &&
    prevSiblingNode &&
    prevSiblingNode.type !== 'CharacterClass' &&
    prevSiblingNode.type !== 'CharacterClassRange' &&
    nextToken &&
    nextToken.type !== 'CharacterClassOpen' &&
    nextToken.type !== 'CharacterClassClose' &&
    nextToken.type !== 'CharacterClassIntersector'
  ) {
    const nextNode = walk(parent, {
      ...state,
      isCheckingRangeEnd: true,
    });
    if (prevSiblingNode.type === 'Character' && nextNode.type === 'Character') {
      parent.elements.pop();
      return createCharacterClassRange(prevSiblingNode, nextNode);
    }
    throw new Error('Invalid character class range');
  }
  // Literal hyphen
  return createCharacter(45);
}

function parseCharacterClassOpen({negate}: CharacterClassOpenToken, context: Context, state: State): CharacterClassNode {
  const {tokens, walk} = context;
  const firstClassToken = tokens[context.current];
  const intersections = [createCharacterClass()];
  let nextToken = throwIfUnclosedCharacterClass(firstClassToken);
  while (nextToken.type !== 'CharacterClassClose') {
    if (nextToken.type === 'CharacterClassIntersector') {
      intersections.push(createCharacterClass());
      // Skip the intersector
      context.current++;
    } else {
      const cc = intersections.at(-1)!; // Always at least one
      cc.elements.push(walk(cc, state) as CharacterClassElementNode);
    }
    nextToken = throwIfUnclosedCharacterClass(tokens[context.current], firstClassToken);
  }
  const node = createCharacterClass({negate});
  if (intersections.length === 1) {
    node.elements = intersections[0].elements;
  } else {
    node.kind = 'intersection';
    node.elements = intersections.map(cc => cc.elements.length === 1 ? cc.elements[0] : cc);
  }
  // Skip the closing square bracket
  context.current++;
  return node;
}

function parseCharacterSet({kind, negate, value}: CharacterSetToken, context: Context): CharacterSetNode {
  const {normalizeUnknownPropertyNames, skipPropertyNameValidation, unicodePropertyMap} = context;
  if (kind === 'property') {
    const normalized = slug(value!);
    // Don't treat as POSIX if it's in the provided list of Unicode property names
    if (PosixClassNames.has(normalized) && !unicodePropertyMap?.has(normalized)) {
      kind = 'posix';
      value = normalized;
    } else {
      return createUnicodeProperty(value!, {
        negate,
        normalizeUnknownPropertyNames,
        skipPropertyNameValidation,
        unicodePropertyMap,
      });
    }
  }
  if (kind === 'posix') {
    return createPosixClass(value!, {negate});
  }
  return createCharacterSet(kind, {negate});
}

function parseGroupOpen(token: GroupOpenToken, context: Context, state: State): AbsentFunctionNode | CapturingGroupNode | GroupNode | LookaroundAssertionNode {
  const {tokens, capturingGroups, namedGroupsByName, skipLookbehindValidation, walk} = context;
  let node = createByGroupKind(token);
  const isThisAbsentFunction = node.type === 'AbsentFunction';
  const isThisLookbehind = isLookbehind(node);
  const isThisNegLookbehind = isThisLookbehind && node.negate;
  // Track capturing group details for backrefs and subroutines (before parsing the group's
  // contents so nested groups with the same name are tracked in order)
  if (node.type === 'CapturingGroup') {
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
  while (nextToken.type !== 'GroupClose') {
    if (nextToken.type === 'Alternator') {
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
          if (isLookahead(child) || child.type === 'CapturingGroup') {
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

function parseNamedCallout({kind, tag, args}: NamedCalloutToken): NamedCalloutNode {
  // TODO: check if kind is correct here
  // and validate tag and args
  return createNamedCallout(kind, tag, args);
}

function parseQuantifier({kind, min, max}: QuantifierToken, context: Context): QuantifierNode {
  const parent = context.parent as AlternativeNode;
  const quantifiedNode = parent.elements.at(-1);
  // TODO: Reusing `quantifiableTypes` (`!quantifiableTypes.has(quantifiedNode.type)`) would be
  // better, but TS doesn't narrow via `has` with a `Set`
  if (
    !quantifiedNode ||
    quantifiedNode.type === 'Assertion' ||
    quantifiedNode.type === 'Directive' ||
    quantifiedNode.type === 'LookaroundAssertion'
  ) {
    throw new Error(`Quantifier requires a repeatable token`);
  }
  const node = createQuantifier(kind, min, max, quantifiedNode);
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
function parseSubroutine({raw}: SubroutineToken, context: Context): SubroutineNode {
  const {capturingGroups, subroutines} = context;
  let ref: string | number = raw.slice(3, -1);
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

// -------------------------------
// --- Node creation and types ---
// -------------------------------

type AbsentFunctionNode = {
  type: 'AbsentFunction';
  kind: NodeAbsentFunctionKind;
  alternatives: Array<AlternativeNode>;
};
function createAbsentFunction(kind: NodeAbsentFunctionKind): AbsentFunctionNode {
  if (kind !== 'repeater') {
    throw new Error(`Unexpected absent function kind "${kind}"`);
  }
  return {
    type: 'AbsentFunction',
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
    type: 'Alternative',
    elements: [],
  };
}

type AssertionNode = {
  type: 'Assertion';
  kind: NodeAssertionKind;
  negate?: boolean;
};
function createAssertion(kind: NodeAssertionKind, options?: {
  negate?: boolean;
}): AssertionNode {
  const node: AssertionNode = {
    type: 'Assertion',
    kind,
  };
  if (kind === 'word_boundary' || kind === 'grapheme_boundary') {
    node.negate = !!options?.negate;
  }
  return node;
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
    type: 'Backreference',
    ref,
    ...(orphan && {orphan}),
  };
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
    type: 'CapturingGroup',
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
    type: 'Character',
    value: charCode,
  };
}

type CharacterClassNode = {
  type: 'CharacterClass';
  kind: NodeCharacterClassKind;
  negate: boolean;
  elements: Array<CharacterClassElementNode>;
};
function createCharacterClass(options?: {
  kind?: NodeCharacterClassKind;
  negate?: boolean;
}): CharacterClassNode {
  const opts = {
    kind: 'union' as NodeCharacterClassKind,
    negate: false,
    ...options,
  };
  return {
    type: 'CharacterClass',
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
    type: 'CharacterClassRange',
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
  kind: Exclude<NodeCharacterSetKind, NamedCharacterSetNode['kind']>;
  value?: never;
  negate?: boolean;
  variableLength?: boolean;
};
type CharacterSetNode = NamedCharacterSetNode | UnnamedCharacterSetNode;
/**
Use `createUnicodeProperty` and `createPosixClass` for `kind` values `'property'` and `'posix'`.
*/
function createCharacterSet(kind: UnnamedCharacterSetNode['kind'], options?: {
  negate?: boolean;
}): UnnamedCharacterSetNode {
  const negate = !!options?.negate;
  const node: UnnamedCharacterSetNode = {
    type: 'CharacterSet',
    kind,
  };
  if (
    kind === 'digit' ||
    kind === 'hex' ||
    kind === 'newline' ||
    kind === 'space' ||
    kind === 'word'
  ) {
    node.negate = negate;
  }
  if (
    kind === 'grapheme' ||
    (kind === 'newline' && !negate)
  ) {
    node.variableLength = true;
  }
  return node;
}

type DirectiveNode = {
  type: 'Directive';
} & ({
  kind: 'keep';
  flags?: never;
} | {
  kind: 'flags';
  flags: FlagGroupModifiers;
});
function createDirective(kind: NodeDirectiveKind, options: {flags?: FlagGroupModifiers} = {}): DirectiveNode {
  if (kind === 'keep') {
    return {
      type: 'Directive',
      kind,
    };
  }
  if (kind === 'flags') {
    // Note: Flag effects might extend across alternation; ex: `a(?i)b|c` is equivalent to
    // `a(?i:b)|(?i:c)`, not `a(?i:b|c)`
    return {
      type: 'Directive',
      kind,
      flags: throwIfNullable(options.flags),
    };
  }
  throw new Error(`Unexpected directive kind "${kind}"`);
}

type FlagsNode = {
  type: 'Flags';
} & FlagProperties;
function createFlags(flags: FlagProperties): FlagsNode {
  return {
    type: 'Flags',
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
    type: 'Group',
    ...(atomic && {atomic}),
    ...(flags && {flags}),
    alternatives: [createAlternative()],
  };
}

type LookaroundAssertionNode = {
  type: 'LookaroundAssertion';
  kind: NodeLookaroundAssertionKind;
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
    type: 'LookaroundAssertion',
    kind: opts.behind ? 'lookbehind' : 'lookahead',
    negate: opts.negate,
    alternatives: [createAlternative()],
  };
}

type NamedCalloutNode = {
  type: 'NamedCallout';
  kind: NodeNamedCalloutKind;
  tag: string | null;
  args: string | null;
};
function createNamedCallout(kind: NodeNamedCalloutKind, tag: string | null, args: string | null): NamedCalloutNode {
  // TODO: check if kind is correct here?
  return {
    type: 'NamedCallout',
    kind,
    tag,
    args,
  };
}

type PatternNode = {
  type: 'Pattern';
  alternatives: Array<AlternativeNode>;
};
function createPattern(): PatternNode {
  return {
    type: 'Pattern',
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
    type: 'CharacterSet',
    kind: 'posix',
    value: name,
    negate,
  };
}

type QuantifierNode = {
  type: 'Quantifier';
  kind: NodeQuantifierKind;
  min: number;
  max: number;
  element: QuantifiableNode;
};
function createQuantifier(kind: NodeQuantifierKind, min: number, max: number, element: QuantifiableNode): QuantifierNode {
  if (min > max) {
    throw new Error('Invalid reversed quantifier range');
  }
  return {
    type: 'Quantifier',
    kind,
    min,
    max,
    element,
  };
}

type RegexNode = {
  type: 'Regex';
  pattern: PatternNode;
  flags: FlagsNode;
};
function createRegex(pattern: PatternNode, flags: FlagsNode): RegexNode {
  return {
    type: 'Regex',
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
    type: 'Subroutine',
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
    type: 'CharacterSet',
    kind: 'property',
    value: normalized ?? name,
    negate: opts.negate,
  };
}

// ---------------
// --- Helpers ---
// ---------------

function createByGroupKind({flags, kind, name, negate, number}: GroupOpenToken): AbsentFunctionNode | CapturingGroupNode | GroupNode | LookaroundAssertionNode {
  switch (kind) {
    case 'absent_repeater':
      return createAbsentFunction('repeater');
    case 'atomic':
      return createGroup({atomic: true});
    case 'capturing':
      return createCapturingGroup(number!, name);
    case 'group':
      return createGroup({flags});
    case 'lookahead':
    case 'lookbehind':
      return createLookaroundAssertion({
        behind: kind === 'lookbehind',
        negate,
      });
    default:
      throw new Error(`Unexpected group kind "${kind}"`);
  }
}

function isLookahead(node: Node): node is (LookaroundAssertionNode & {kind: 'lookahead'}) {
  return node.type === 'LookaroundAssertion' && node.kind === 'lookahead';
}

function isLookbehind(node: Node): node is (LookaroundAssertionNode & {kind: 'lookbehind'}) {
  return node.type === 'LookaroundAssertion' && node.kind === 'lookbehind';
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

function throwIfUnclosedCharacterClass<T>(token: T, firstClassToken?: Token): NonNullable<T> {
  return throwIfNullable(
    token,
    // Easier to understand the error if it says "empty" when the unclosed class starts with
    // literal `]`; ex: `[]` or `[]a`
    `${firstClassToken?.type === 'Character' && firstClassToken.value === 93 ?
      'Empty' : 'Unclosed'} character class`
  );
}

function throwIfUnclosedGroup<T>(token: T): NonNullable<T> {
  return throwIfNullable(token, 'Unclosed group');
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
  type NamedCalloutNode,
  type Node,
  type NodeAbsentFunctionKind,
  type NodeAssertionKind,
  type NodeCharacterClassKind,
  type NodeCharacterSetKind,
  type NodeDirectiveKind,
  type NodeLookaroundAssertionKind,
  type NodeQuantifierKind,
  type NodeType,
  type OnigurumaAst,
  type ParentNode,
  type PatternNode,
  type QuantifiableNode,
  type QuantifierNode,
  type RegexNode,
  type SubroutineNode,
  type UnicodePropertyMap,
};

import type {CharacterSetNode, Node} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';
import {createCharacterSet} from '../../parser/parse.js';
import {cpOf} from '../../utils.js';

/**
Use shorthands (`\d`, `\h`, `\s`, etc.) when possible.
- `\d` from `\p{Decimal_Number}`, `\p{Nd}`, `\p{digit}`, `[[:digit:]]`
- `\h` from `\p{ASCII_Hex_Digit}`, `\p{AHex}`, `\p{xdigit}`, `[[:xdigit:]]`, `[0-9A-Fa-f]`
- `\s` from `\p{White_Space}`, `\p{WSpace}`, `\p{space}`, `[[:space:]]`
- `\w` from `[\p{L}\p{M}\p{N}\p{Pc}]` - Not the same as POSIX `\p{word}`, `[[:word:]]`!
- `\O` from `\p{Any}` if not in class
See also `useUnicodeProps`.
*/
const useShorthands: Visitor = {
  CharacterSet({node, parent, root, replaceWith}) {
    const {kind, negate, value} = node;
    let newNode: CharacterSetNode | null = null;
    if (
      ( kind === 'property' &&
        (value === 'Decimal_Number' || value === 'Nd') &&
        // TODO: Also check local context when the parser supports these flags on pattern modifiers
        !root.flags.digitIsAscii &&
        !root.flags.posixIsAscii
      ) ||
      ( kind === 'posix' &&
        value === 'digit'
      )
    ) {
      newNode = createCharacterSet('digit', {negate});
    } else if (
      ( kind === 'property' &&
        (value === 'ASCII_Hex_Digit' || value === 'AHex')
      ) ||
      ( kind === 'posix' &&
        value === 'xdigit'
      )
    ) {
      newNode = createCharacterSet('hex', {negate});
    } else if (
      ( kind === 'property' &&
        (value === 'White_Space' || value === 'WSpace') &&
        // TODO: Also check local context when the parser supports these flags on pattern modifiers
        !root.flags.spaceIsAscii &&
        !root.flags.posixIsAscii
      ) ||
      ( kind === 'posix' &&
        value === 'space'
      )
    ) {
      newNode = createCharacterSet('space', {negate});
    } else if (
      parent.type !== 'CharacterClass' &&
      kind === 'property' &&
      !negate &&
      value === 'Any'
    ) {
      newNode = createCharacterSet('any');
    }
    if (newNode) {
      replaceWith(newNode);
    }
  },

  CharacterClass({node, root}) {
    if (node.kind !== 'union') {
      return;
    }
    const has = {
      rangeDigit0To9: false,
      rangeAToFLower: false,
      rangeAToFUpper: false,
      unicodeL: false,
      unicodeM: false,
      unicodeN: false,
      unicodePc: false,
    };
    for (const kid of node.body) {
      if (kid.type === 'CharacterClassRange') {
        has.rangeDigit0To9 ||= isRange(kid, cp.n0, cp.n9);
        has.rangeAToFLower ||= isRange(kid, cp.a, cp.f);
        has.rangeAToFUpper ||= isRange(kid, cp.A, cp.F);
      } else if (kid.type === 'CharacterSet') {
        has.unicodeL ||= isUnicode(kid, 'L');
        has.unicodeM ||= isUnicode(kid, 'M');
        has.unicodeN ||= isUnicode(kid, 'N');
        has.unicodePc ||= isUnicode(kid, 'Pc', {includeSupercategories: true});
      }
    }
    // TODO: Only need one of A-F or a-f if flag i is active in local context; relies on
    // <github.com/slevithan/oniguruma-parser/issues/14>
    if (has.rangeDigit0To9 && has.rangeAToFUpper && has.rangeAToFLower) {
      node.body = node.body.filter(kid => !(
        isRange(kid, cp.n0, cp.n9) || isRange(kid, cp.a, cp.f) || isRange(kid, cp.A, cp.F)
      ));
      node.body.push(createCharacterSet('hex'));
    }
    if (
      (has.unicodeL && has.unicodeM && has.unicodeN && has.unicodePc) &&
      // TODO: Also check local context when the parser supports these flags on pattern modifiers
      !root.flags.wordIsAscii &&
      !root.flags.posixIsAscii
    ) {
      node.body = node.body.filter(kid => !isUnicode(kid, ['L', 'M', 'N', 'Pc'], {
        includeSubcategories: true,
      }));
      node.body.push(createCharacterSet('word'));
    }
  },
};

const cp = {
  n0: cpOf('0'),
  n9: cpOf('9'),
  A: cpOf('A'),
  F: cpOf('F'),
  a: cpOf('a'),
  f: cpOf('f'),
};

function isRange(node: Node, min: number, max: number): boolean {
  return (
    node.type === 'CharacterClassRange' &&
    node.min.value === min &&
    node.max.value === max
  );
}

function isUnicode(
  node: Node,
  value: string | Array<string>,
  options: {includeSupercategories?: boolean; includeSubcategories?: boolean} = {}
): boolean {
  if (
    node.type !== 'CharacterSet' ||
    node.kind !== 'property' ||
    node.negate
  ) {
    return false;
  }
  const names = Array.isArray(value) ? value : [value];
  const expanded: Array<string> = [];
  for (const v of names) {
    expanded.push(v);
    const supercategoryFullName = categories[v as SupercategoryShortName]?.full;
    const supercategoryShortName = supercategories[v as SubcategoryShortName];
    const subcategoryShortNames = categories[v as SupercategoryShortName]?.sub;
    if (supercategoryFullName) {
      expanded.push(supercategoryFullName);
    }
    if (options.includeSupercategories && supercategoryShortName) {
      expanded.push(supercategoryShortName);
      expanded.push(categories[supercategoryShortName].full);
    }
    if (options.includeSubcategories && subcategoryShortNames) {
      expanded.push(...subcategoryShortNames);
    }
  }
  return expanded.includes(node.value);
}

type SupercategoryShortName = 'L' | 'M' | 'N' | 'P';
type SubcategoryShortName = typeof subL[number] | typeof subM[number] | typeof subN[number] | typeof subP[number];
const subL = ['Ll', 'Lm', 'Lo', 'Lt', 'Lu'] as const;
const subM = ['Mc', 'Me', 'Mn'] as const;
const subN = ['Nd', 'Nl', 'No'] as const;
const subP = ['Pc', 'Pd', 'Pe', 'Pf', 'Pi', 'Po', 'Ps'] as const;
const categories: {[key in SupercategoryShortName]: {full: string; sub: ReadonlyArray<SubcategoryShortName>}} = {
  L: {full: 'Letter', sub: subL},
  M: {full: 'Mark', sub: subM},
  N: {full: 'Number', sub: subN},
  P: {full: 'Punctuation', sub: subP},
};
const supercategories = {} as {[key in SubcategoryShortName]: SupercategoryShortName};
for (const key of Object.keys(categories) as Array<SupercategoryShortName>) {
  for (const sub of categories[key].sub) {
    supercategories[sub] = key;
  }
}

export {
  isRange,
  useShorthands,
};

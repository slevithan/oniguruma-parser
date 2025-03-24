import {createCharacterSet, NodeCharacterClassKinds, NodeCharacterSetKinds, NodeTypes} from '../../parser/parse.js';
import type {CharacterClassNode, CharacterSetNode, Node} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

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
  CharacterSet({node, parent, root, replaceWith}: Path) {
    const {kind, negate, value} = node as CharacterSetNode;
    let newNode;
    if (
      ( kind === NodeCharacterSetKinds.property &&
        (value === 'Decimal_Number' || value === 'Nd') &&
        // [TODO] Also check local context, after the parser supports these flags on mode modifiers
        !root.flags.digitIsAscii &&
        !root.flags.posixIsAscii
      ) ||
      ( kind === NodeCharacterSetKinds.posix &&
        value === 'digit'
      )
    ) {
      newNode = createCharacterSet(NodeCharacterSetKinds.digit, {negate});
    } else if (
      ( kind === NodeCharacterSetKinds.property &&
        (value === 'ASCII_Hex_Digit' || value === 'AHex')
      ) ||
      ( kind === NodeCharacterSetKinds.posix &&
        value === 'xdigit'
      )
    ) {
      newNode = createCharacterSet(NodeCharacterSetKinds.hex, {negate});
    } else if (
      ( kind === NodeCharacterSetKinds.property &&
        (value === 'White_Space' || value === 'WSpace') &&
        // [TODO] Also check local context, after the parser supports these flags on mode modifiers
        !root.flags.spaceIsAscii &&
        !root.flags.posixIsAscii
      ) ||
      ( kind === NodeCharacterSetKinds.posix &&
        value === 'space'
      )
    ) {
      newNode = createCharacterSet(NodeCharacterSetKinds.space, {negate});
    } else if (
      parent!.type !== NodeTypes.CharacterClass &&
      kind === NodeCharacterSetKinds.property &&
      !negate &&
      value === 'Any'
    ) {
      newNode = createCharacterSet(NodeCharacterSetKinds.any);
    }

    if (newNode) {
      replaceWith(newNode);
    }
  },

  CharacterClass(path: Path) {
    const {node, root} = path as Path<CharacterClassNode>;
    if (node.kind !== NodeCharacterClassKinds.union) {
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
    for (const kid of node.elements) {
      if (kid.type === NodeTypes.CharacterClassRange) {
        has.rangeDigit0To9 ||= isRange(kid, 48, 57); // '0' to '9'
        has.rangeAToFLower ||= isRange(kid, 97, 102); // 'a' to 'f'
        has.rangeAToFUpper ||= isRange(kid, 65, 70); // 'A' to 'F'
      } else if (kid.type === NodeTypes.CharacterSet) {
        has.unicodeL ||= isUnicode(kid, 'L');
        has.unicodeM ||= isUnicode(kid, 'M');
        has.unicodeN ||= isUnicode(kid, 'N');
        has.unicodePc ||= isUnicode(kid, 'Pc', {includeSupercategories: true});
      }
    }
    if (has.rangeDigit0To9 && has.rangeAToFUpper && has.rangeAToFLower) {
      node.elements = node.elements.filter(kid => !(
        isRange(kid, 48, 57) || isRange(kid, 97, 102) || isRange(kid, 65, 70)
      ));
      node.elements.push(createCharacterSet(NodeCharacterSetKinds.hex));
    }
    if (
      (has.unicodeL && has.unicodeM && has.unicodeN && has.unicodePc) &&
      // [TODO] Also check local context, after the parser supports these flags on mode modifiers
      !root.flags.wordIsAscii &&
      !root.flags.posixIsAscii
    ) {
      node.elements = node.elements.filter(kid => !isUnicode(kid, ['L', 'M', 'N', 'Pc'], {
        includeSubcategories: true,
      }));
      node.elements.push(createCharacterSet(NodeCharacterSetKinds.word));
    }
  },
};

function isRange(node: Node, min: number, max: number): boolean {
  return (
    node.type === NodeTypes.CharacterClassRange &&
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
    node.type !== NodeTypes.CharacterSet ||
    node.kind !== NodeCharacterSetKinds.property ||
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
      const resolvedSupercategoryFullName = categories[supercategoryShortName].full;
      if (resolvedSupercategoryFullName) {
        expanded.push(resolvedSupercategoryFullName);
      }
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

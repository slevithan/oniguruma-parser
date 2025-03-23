import {createCharacterSet, NodeCharacterClassKinds, NodeCharacterSetKinds, NodeTypes} from '../../parser/parse.js';
import type {CharacterClassElementNode, CharacterClassNode, CharacterSetNode} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';

/**
Use shorthands (`\d`, `\h`, `\s`, etc.) when possible.
- `\d` from `\p{Decimal_Number}`, `\p{Nd}`, `\p{digit}`, `[[:digit:]]`
- `\h` from `\p{ASCII_Hex_Digit}`, `\p{AHex}`, `\p{xdigit}`, `[[:xdigit:]]`, `[0-9A-Fa-f]`
- `\s` from `\p{White_Space}`, `\p{WSpace}`, `\p{space}`, `[[:space:]]`
- `\w` from `[\p{L}\p{M}\p{N}\p{Pc}]` - Not the same as POSIX `\p{word}`, `[[:word:]]`!
- `\O` from `\p{Any}` if not in class
See also `useUnicodeProps`.
*/
const useShorthands = {
  CharacterSet({node, parent, root, replaceWith}: Path & {node: CharacterSetNode}) {
    const {kind, negate, value} = node;
    let newNode;
    if (
      ( kind === NodeCharacterSetKinds.property &&
        (value === 'Decimal_Number' || value === 'Nd') &&
        // [TODO] Also need to check whether these flags are set in local context, when the parser
        // supports these flags on mode modifiers
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
        // [TODO] Also need to check whether these flags are set in local context, when the parser
        // supports these flags on mode modifiers
        !root.flags.spaceIsAscii &&
        !root.flags.posixIsAscii
      ) ||
      ( kind === NodeCharacterSetKinds.posix &&
        value === 'space'
      )
    ) {
      newNode = createCharacterSet(NodeCharacterSetKinds.space, {negate});
    } else if (
      parent.type !== NodeTypes.CharacterClass &&
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

  CharacterClass({node, root}: Path & {node: CharacterClassNode}) {
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
        has.unicodePc ||= isUnicode(kid, 'Pc', {supercategories: true});
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
      // [TODO] Also need to check whether these flags are set in local context, when the parser
      // supports these flags on mode modifiers
      !root.flags.wordIsAscii &&
      !root.flags.posixIsAscii
    ) {
      node.elements = node.elements.filter(kid => !isUnicode(kid, ['L', 'M', 'N', 'Pc'], {
        subcategories: true,
      }));
      node.elements.push(createCharacterSet(NodeCharacterSetKinds.word));
    }
  },
};

function isRange(node: CharacterClassElementNode, min: number, max: number) {
  return (
    node.type === NodeTypes.CharacterClassRange &&
    node.min.value === min &&
    node.max.value === max
  );
}

function isUnicode(
  node: CharacterClassElementNode,
  value: string | Array<string>,
  options: {supercategories?: boolean; subcategories?: boolean;} = {}
) {
  if (
    node.type !== NodeTypes.CharacterSet ||
    node.kind !== NodeCharacterSetKinds.property ||
    node.negate
  ) {
    return false;
  }
  const names = Array.isArray(value) ? value : [value];
  const expanded = [];
  for (const v of names) {
    expanded.push(v);
    if (fullNames.has(v)) {
      expanded.push(fullNames.get(v));
    }
    if (options.supercategories && supercategories.has(v)) {
      expanded.push(supercategories.get(v));
      if (fullNames.has(supercategories.get(v))) {
        expanded.push(fullNames.get(supercategories.get(v)));
      }
    }
    if (options.subcategories && subcategories.has(v)) {
      expanded.push(...subcategories.get(v));
    }
  }
  return expanded.includes(node.value);
}

const fullNames = new Map([
  ['L', 'Letter'],
  ['M', 'Mark'],
  ['N', 'Number'],
  ['P', 'Punctuation'],
]);

const subcategories = new Map([
  ['L', ['Ll', 'Lm', 'Lo', 'Lt', 'Lu']],
  ['M', ['Mc', 'Me', 'Mn']],
  ['N', ['Nd', 'Nl', 'No']],
]);

const supercategories = new Map([
  ['Pc', 'P'],
]);

export {
  isRange,
  useShorthands,
};

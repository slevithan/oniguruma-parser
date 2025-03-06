import {createCharacterSet, createUnicodeProperty, NodeCharacterSetKinds, NodeTypes} from '../../parser/parse.js';
import {cp} from '../../utils.js';

/**
Use shorthands (`\d`, `\h`, `\s`, etc.) when possible.
- `\d` from `\p{Decimal_Number}`, `\p{Nd}`, `\p{digit}`, `[[:digit:]]`
- `\h` from `\p{ASCII_Hex_Digit}`, `\p{AHex}`, `\p{xdigit}`, `[[:xdigit:]]`, `[0-9A-Fa-f]`
- `\s` from `\p{White_Space}`, `\p{WSpace}`, `\p{space}`, `[[:space:]]`
- `\w` from `[\p{L}\p{M}\p{N}\p{Pc}]`
- `\p{Cc}` from `\p{cntrl}`, `[[:cntrl:]]`
See also the optimization `useUnicodeAliases`.

[TODO] Add the following shorthands:
- `\N` (not in class) from `[^\n]`
- `\O` (not in class) from `\p{Any}`, `[\d\D]`, `[\h\H]`, `[\s\S]`, `[\w\W]`, `[\0-\x{10FFFF}]`
  - `\p{Any} (only in class) from `[\0-\x{10FFFF}]`
- `\p{alnum}` from `[\p{alpha}\p{Nd}]`
- `\p{blank}` from `[\p{Zs}\t]`
- `\p{graph}` from `[\S&&\P{Cc}&&\P{Cn}&&\P{Cs}]`
- `\p{print}` from `[[\S&&\P{Cc}&&\P{Cn}&&\P{Cs}]\p{Zs}]`
- `\p{word}` from `[\p{alpha}\p{M}\p{Nd}\p{Pc}]` - Not the same as `\w`!
- `[[:punct:]]` from `[\p{P}\p{S}]` - Not the same as `\p{punct}`!
*/
const useShorthands = {
  CharacterSet({node, root, replaceWith}) {
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
      kind === NodeCharacterSetKinds.posix &&
      value === 'cntrl' &&
      // [TODO] Also need to check whether this flag is set in local context, when the parser
      // supports this flag on mode modifiers
      !root.flags.posixIsAscii
    ) {
      newNode = createUnicodeProperty('Cc', {negate});
    }

    if (newNode) {
      replaceWith(newNode);
    }
  },

  CharacterClass({node, root}) {
    const has = {
      range0To9: false,
      rangeAToFLower: false,
      rangeAToFUpper: false,
      unicodeL: false,
      unicodeM: false,
      unicodeN: false,
      unicodePc: false,
    }
    for (const kid of node.elements) {
      if (kid.type === NodeTypes.CharacterClassRange) {
        has.range0To9 ||= isRange(kid, '0', '9');
        has.rangeAToFLower ||= isRange(kid, 'a', 'f');
        has.rangeAToFUpper ||= isRange(kid, 'A', 'F');
      } else if (kid.type === NodeTypes.CharacterSet) {
        has.unicodeL ||= isUnicode(kid, 'L');
        has.unicodeM ||= isUnicode(kid, 'M');
        has.unicodeN ||= isUnicode(kid, 'N');
        has.unicodePc ||= isUnicode(kid, 'Pc', {supercategories: true});
      }
    }
    if (has.range0To9 && has.rangeAToFUpper && has.rangeAToFLower) {
      node.elements = node.elements.filter(kid => !(
        isRange(kid, '0', '9') || isRange(kid, 'a', 'f') || isRange(kid, 'A', 'F')
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

function isRange(node, min, max) {
  return (
    node.type === NodeTypes.CharacterClassRange &&
    cp(node.min.value) === min &&
    cp(node.max.value) === max
  );
}

function isUnicode(node, value, options = {}) {
  const names = Array.isArray(value) ? value : [value];
  const expanded = [];
  for (const v of names) {
    expanded.push(v);
    if (fullNames[v]) {
      expanded.push(fullNames[v]);
    }
    if (options.supercategories && supercategories[v]) {
      expanded.push(supercategories[v]);
      if (fullNames[supercategories[v]]) {
        expanded.push(fullNames[supercategories[v]]);
      }
    }
    if (options.subcategories && subcategories[v]) {
      expanded.push(...subcategories[v]);
    }
  }
  return (
    node.type === NodeTypes.CharacterSet &&
    node.kind === NodeCharacterSetKinds.property &&
    !node.negate &&
    expanded.includes(node.value)
  );
}

const fullNames = {
  L: 'Letter',
  M: 'Mark',
  N: 'Number',
  P: 'Punctuation',
};

const supercategories = {
  Pc: 'P',
};

const subcategories = {
  L: ['Ll', 'Lm', 'Lo', 'Lt', 'Lu'],
  M: ['Mc', 'Me', 'Mn'],
  N: ['Nd', 'Nl', 'No'],
};

export {
  useShorthands,
};

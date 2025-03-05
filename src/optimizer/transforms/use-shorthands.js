import {createCharacterSet, createUnicodeProperty, NodeCharacterSetKinds} from '../../parser/parse.js';

/**
Use shorthands (`\d`, `\h`, `\s`, etc.) when possible.
- `\d` from `\p{Decimal_Number}`, `\p{Nd}`, `\p{digit}`, `[[:digit:]]`
- `\h` from `\p{ASCII_Hex_Digit}`, `\p{AHex}`, `\p{xdigit}`, `[[:xdigit:]]`
- `\s` from `\p{White_Space}`, `\p{WSpace}`, `\p{space}`, `[[:space:]]`
- `\p{Cc}` from `\p{cntrl}`, `[[:cntrl:]]`
See also the optimization `useUnicodeAliases`.

[TODO] Add the following shorthands (these can improve performance):
- `\h` from `[0-9A-Fa-f]`
- `\w` from `[\p{L}\p{M}\p{N}\p{Pc}]`
- `\p{word}` from `[\p{alpha}\p{M}\p{Nd}\p{Pc}]`
- `\N` (not in class) from `[^\n]`
- `\O` (not in class) from `\p{Any}`, `[\d\D]`, `[\h\H]`, `[\s\S]`, `[\w\W]`, `[\0-\x{10FFFF}]`
  - `\p{Any} (only in class) from `[\0-\x{10FFFF}]`
- `\p{alnum}` from `[\p{alpha}\p{Nd}]`
- `\p{blank}` from `[\p{Zs}\t]`
- `\p{graph}` from `[\S&&\P{Cc}&&\P{Cn}&&\P{Cs}]`
- `\p{print}` from `[[\S&&\P{Cc}&&\P{Cn}&&\P{Cs}]\p{Zs}]`
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
};

export {
  useShorthands,
};

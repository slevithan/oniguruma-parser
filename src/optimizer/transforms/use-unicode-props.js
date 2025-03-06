import {createUnicodeProperty, NodeCharacterSetKinds} from '../../parser/parse.js';
import {isRange} from './use-shorthands.js';

/**
Use Unicode properties when possible.
- `\p{Any}` from `[0-\x{10FFFF}]`
- `\p{Cc}` from POSIX `\p{cntrl}`, `[[:cntrl:]]`
See also `useShorthands`.
*/
const useUnicodeProps = {
  CharacterSet({node, root, replaceWith}) {
    const {kind, negate, value} = node;
    let newNode;
    if (
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

  CharacterClassRange({node, replaceWith}) {
    if (isRange(node, 0, 0x10FFFF)) {
      replaceWith(createUnicodeProperty('Any'));
    }
  },
};

export {
  useUnicodeProps,
};

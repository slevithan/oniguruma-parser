import {createUnicodeProperty, NodeCharacterClassKinds, NodeCharacterSetKinds, NodeTypes} from '../../parser/parse.js';
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

  CharacterClass({node}) {
    if (node.kind !== NodeCharacterClassKinds.union) {
      return;
    }
    const has = {
      range0To10FFFF: false,
    }
    for (const kid of node.elements) {
      if (kid.type === NodeTypes.CharacterClassRange) {
        has.range0To10FFFF ||= isRange(kid, 0, 0x10FFFF);
      }
    }
    if (has.range0To10FFFF) {
      node.elements = node.elements.filter(kid => !isRange(kid, 0, 0x10FFFF));
      node.elements.push(createUnicodeProperty('Any'));
    }
  },
};

export {
  useUnicodeProps,
};

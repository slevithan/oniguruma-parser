import {universalCharacterSetKinds} from '../../parser/node-utils.js';
import {NodeCharacterClassKinds, NodeTypes} from '../../parser/parse.js';

/**
Unwrap outermost character classes containing a single character or character set.
*/
const unwrapUselessClasses = {
  CharacterClass({node, parent, replaceWith}) {
    const {kind, negate, elements} = node;
    if (
      parent.type === NodeTypes.CharacterClass ||
      kind !== NodeCharacterClassKinds.union ||
      elements.length !== 1
    ) {
      return;
    }
    const firstEl = elements[0];
    if (negate) {
      if (firstEl.type === NodeTypes.CharacterSet && universalCharacterSetKinds.has(firstEl.kind)) {
        firstEl.negate = !firstEl.negate;
        replaceWith(firstEl, {traverse: true});
      }
    } else if (firstEl.type === NodeTypes.Character || firstEl.type === NodeTypes.CharacterSet) {
      replaceWith(firstEl, {traverse: true});
    }
  },
};

export {
  unwrapUselessClasses,
};

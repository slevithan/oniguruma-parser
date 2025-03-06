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
      // Don't need to check if `kind` is in `universalCharacterSetKinds` because all character
      // sets valid in character classes are in that set
      if (firstEl.type === NodeTypes.CharacterSet) {
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

import {NodeCharacterClassKinds, NodeTypes} from '../../parser/parse.js';

/**
Unwrap outermost character classes containing a single character or character set.
*/
const unwrapUselessClasses = {
  CharacterClass({node, parent, replaceWith}) {
    const {kind, negate, elements} = node;
    const firstEl = elements[0];
    if (
      parent.type !== NodeTypes.CharacterClass &&
      !negate &&
      kind === NodeCharacterClassKinds.union &&
      elements.length === 1 &&
      (firstEl.type === NodeTypes.Character || firstEl.type === NodeTypes.CharacterSet)
    ) {
      replaceWith(firstEl, {traverse: true});
    }
  },
};

export {
  unwrapUselessClasses,
};

import {NodeCharacterClassKinds, NodeTypes} from '../../parser/parse.js';

/**
Unnest character classes when possible.
*/
const unnestUselessClasses = {
  CharacterClass({node, parent, replaceWith, replaceWithMultiple}) {
    const {kind, negate, elements} = node;
    if (
      parent.type !== NodeTypes.CharacterClass ||
      kind !== NodeCharacterClassKinds.union ||
      !elements.length
    ) {
      return;
    }
    if (negate) {
      const kid = elements[0];
      // Don't need to check if `kind` is in `universalCharacterSetKinds` because all character
      // sets valid in character classes are in that set
      if (elements.length === 1 && kid.type === NodeTypes.CharacterSet) {
        kid.negate = !kid.negate;
        replaceWith(kid, {traverse: true});
      }
    } else if (
      parent.kind === NodeCharacterClassKinds.union ||
      // Can unnest into intersection if there is only one element
      // [TODO] After supporting `format` for character classes in the parser, can visually
      // "unnest" any number of elements into intersection by flipping the class's format from
      // `'explicit'` to `'implicit'`
      elements.length === 1
    ) {
      replaceWithMultiple(elements, {traverse: true});
    }
  },
};

export {
  unnestUselessClasses,
};

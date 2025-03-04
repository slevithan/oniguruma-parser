import {NodeCharacterClassKinds, NodeTypes} from '../../parser/parse.js';

/**
Unnest non-negated, non-intersection character classes.
*/
const unnestUselessClasses = {
  CharacterClass({node, parent, replaceWithMultiple}) {
    const {kind, negate, elements} = node;
    if (
      parent.type === NodeTypes.CharacterClass &&
      !negate &&
      kind === NodeCharacterClassKinds.union &&
      elements.length &&
      // [TODO] After supporting `format: 'implicit'` in the parser, update to flip the format if `'explicit'`
      (parent.kind === NodeCharacterClassKinds.union || elements.length === 1)
    ) {
      replaceWithMultiple(elements, {traverse: true});
    }
  },
};

export {
  unnestUselessClasses,
};

import {AstCharacterClassKinds, AstTypes} from '../../parser/parse.js';

/**
Unnest non-negated character classes that don't contain intersection.
*/
const unnestUselessClasses = {
  CharacterClass({node, parent, replaceWithMultiple}) {
    const {kind, negate, elements} = node;
    if (
      parent.type === AstTypes.CharacterClass &&
      !negate &&
      kind === AstCharacterClassKinds.union &&
      elements.length &&
      // [TODO] After supporting `format: 'implicit'` in the parser, update to flip the format if `'explicit'`
      (parent.kind === AstCharacterClassKinds.union || elements.length === 1)
    ) {
      replaceWithMultiple(elements, {traverse: true});
    }
  },
};

export {
  unnestUselessClasses,
};

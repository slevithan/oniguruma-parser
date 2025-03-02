import {AstCharacterClassKinds, AstTypes} from '../../parser/parse.js';

/**
Unnest only-child character classes.
*/
const transform = {
  CharacterClass({node, parent, replaceWith}) {
    const {kind, negate, elements} = node;
    const firstEl = elements[0];
    if (
      kind === AstCharacterClassKinds.union &&
      elements.length === 1 &&
      firstEl.type === AstTypes.CharacterClass &&
      firstEl.kind === AstCharacterClassKinds.union
    ) {
      firstEl.negate = negate !== firstEl.negate;
      replaceWith(firstEl, {traverse: true});
    }
  },
};

export default transform;

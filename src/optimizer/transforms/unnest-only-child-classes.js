import {NodeCharacterClassKinds, NodeTypes} from '../../parser/parse.js';

/**
Unnest character classes that are an only-child of a character class.
*/
const unnestOnlyChildClasses = {
  CharacterClass({node, replaceWith}) {
    const {kind, negate, elements} = node;
    const firstEl = elements[0];
    if (
      kind === NodeCharacterClassKinds.union &&
      elements.length === 1 &&
      firstEl.type === NodeTypes.CharacterClass &&
      firstEl.kind === NodeCharacterClassKinds.union
    ) {
      firstEl.negate = negate !== firstEl.negate;
      replaceWith(firstEl, {traverse: true});
    }
  },
};

export {
  unnestOnlyChildClasses,
};

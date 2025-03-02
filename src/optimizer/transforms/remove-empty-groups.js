import {AstTypes} from '../../parser/parse.js';

/**
Remove empty noncapturing, atomic, and flag groups, plus any attached quantifiers.
*/
const removeEmptyGroups = {
  Group({node, remove}) {
    if (isEmptyGroup(node)) {
      remove();
    }
  },

  Quantifier({node, remove}) {
    let kid = node.element;
    while (kid.type === AstTypes.Quantifier) {
      kid = kid.element;
    }
    if (isEmptyGroup(kid)) {
      remove();
    }
  },
};

function isEmptyGroup(node) {
  return (
    node.type === AstTypes.Group &&
    node.alternatives.every(alt => !alt.elements.length)
  );
}

export {
  removeEmptyGroups,
};

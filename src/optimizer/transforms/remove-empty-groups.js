import {NodeTypes} from '../../parser/parse.js';

/**
Remove empty noncapturing, atomic, and flag groups, even if quantified.
*/
const removeEmptyGroups = {
  Group({node, remove}) {
    if (isEmptyGroup(node)) {
      remove();
    }
  },

  Quantifier({node, remove}) {
    let kid = node.element;
    while (kid.type === NodeTypes.Quantifier) {
      kid = kid.element;
    }
    if (isEmptyGroup(kid)) {
      remove();
    }
  },
};

function isEmptyGroup(node) {
  return (
    node.type === NodeTypes.Group &&
    node.alternatives.every(alt => !alt.elements.length)
  );
}

export {
  removeEmptyGroups,
};

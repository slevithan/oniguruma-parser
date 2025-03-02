import {AstTypes} from '../../parser/parse.js';

/**
Remove empty noncapturing, atomic, and flag groups, plus any attached quantifiers.
TODO: Remove groups with with multiple empty alternatives.
*/
const transform = {
  Group({node, remove}) {
    if (isEmptyGroupOrContainsOnlyEmptyGroups(node)) {
      remove();
    }
  },

  Quantifier({node, remove}) {
    let kid = node.element;
    while (kid.type === AstTypes.Quantifier) {
      kid = kid.element;
    }
    if (isEmptyGroupOrContainsOnlyEmptyGroups(kid)) {
      remove();
    }
  },
};

function isEmptyGroup(node) {
  return (
    node.type === AstTypes.Group &&
    node.alternatives.length === 1 &&
    node.alternatives[0].elements.length === 0
  );
}

function isEmptyGroupOrContainsOnlyEmptyGroups(node) {
  while (
    node.type === AstTypes.Group &&
    node.alternatives.length === 1 &&
    node.alternatives[0].elements.length === 1
  ) {
    node = node.alternatives[0].elements[0];
  }
  return isEmptyGroup(node);
}

export default transform;

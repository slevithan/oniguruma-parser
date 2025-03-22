import {NodeTypes, type GroupNode, type Node, type QuantifierNode} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';

/**
Remove empty noncapturing, atomic, and flag groups, even if quantified.
*/
const removeEmptyGroups = {
  Group({node, remove}: Path & {node: GroupNode;}) {
    if (isEmptyGroup(node)) {
      remove();
    }
  },

  Quantifier({node, remove}: Path & {node: QuantifierNode;}) {
    let kid = node.element;
    while (kid.type === NodeTypes.Quantifier) {
      kid = kid.element;
    }
    if (isEmptyGroup(kid)) {
      remove();
    }
  },
};

function isEmptyGroup(node: Node) {
  return (
    node.type === NodeTypes.Group &&
    node.alternatives.every(alt => !alt.elements.length)
  );
}

export {
  removeEmptyGroups,
};

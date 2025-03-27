import type {Node, QuantifierNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

/**
Remove empty noncapturing, atomic, and flag groups, even if quantified.
*/
const removeEmptyGroups: Visitor = {
  Group({node, remove}: Path) {
    if (isEmptyGroup(node)) {
      remove();
    }
  },

  Quantifier(path: Path) {
    const {node, remove} = path as Path<QuantifierNode>;
    let kid = node.element;
    while (kid.type === 'Quantifier') {
      kid = kid.element;
    }
    if (isEmptyGroup(kid)) {
      remove();
    }
  },
};

function isEmptyGroup(node: Node): boolean {
  return (
    node.type === 'Group' &&
    node.alternatives.every(alt => !alt.elements.length)
  );
}

export {
  removeEmptyGroups,
};

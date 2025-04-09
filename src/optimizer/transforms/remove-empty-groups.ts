import type {AlternativeContainerNode, Node, QuantifierNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

/**
Remove empty noncapturing, atomic, and flag groups, even if quantified.
*/
const removeEmptyGroups: Visitor = {
  AbsenceFunction({node, remove}: Path) {
    if (isQualifiedAndEmpty(node)) {
      remove();
    }
  },

  Group({node, remove}: Path) {
    if (isQualifiedAndEmpty(node)) {
      remove();
    }
  },

  LookaroundAssertion({node, remove}: Path) {
    if (isQualifiedAndEmpty(node)) {
      remove();
    }
  },

  Quantifier(path: Path) {
    const {node, remove} = path as Path<QuantifierNode>;
    let kid = node.body;
    while (kid.type === 'Quantifier') {
      kid = kid.body;
    }
    if (isQualifiedAndEmpty(kid)) {
      remove();
    }
  },
};

function hasOnlyEmptyAlts(node: AlternativeContainerNode): boolean {
  return node.body.every(alt => !alt.body.length);
}

function isQualifiedAndEmpty(node: Node): boolean {
  switch (node.type) {
    case 'AbsenceFunction':
      return node.kind === 'repeater' && hasOnlyEmptyAlts(node);
    case 'Group':
      return hasOnlyEmptyAlts(node);
    case 'LookaroundAssertion':
      return !node.negate && hasOnlyEmptyAlts(node);
    default:
      return false;
  }
}

export {
  removeEmptyGroups,
};

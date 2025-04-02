import type {CapturingGroupNode, Node} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

/**
Pull leading and trailing assertions out of unquantified capturing groups; helps group unwrapping.
*/
const exposeAnchors: Visitor = {
  // Noncapturing groups are already handled by a combination of `unwrapUselessGroups` and
  // `removeUselessFlags`, the latter of which also avoids hazards from flags that modify word
  // boundary and grapheme boundary assertions
  CapturingGroup(path: Path) {
    const {node, parent, replaceWithMultiple} = path as Path<CapturingGroupNode>;
    if (parent!.type === 'Quantifier' || node.alternatives.length > 1) {
      return;
    }
    const firstAlt = node.alternatives[0];
    const firstAltEls = firstAlt.elements;
    // Despite only pulling one assertion at a time, multiple can be extracted through multiple
    // rounds of running this optimization
    const leading = firstAltEls[0];
    const trailing = firstAltEls.length > 1 ? firstAltEls.at(-1)! : null;
    const hasLeadingAssertion = leading && leading.type === 'Assertion';
    const hasTrailingAssertion = trailing && trailing.type === 'Assertion';
    const clippedStart = hasLeadingAssertion ? 1 : 0;
    const clippedEnd = firstAltEls.length - (hasTrailingAssertion ? 1 : 0);
    if (hasLeadingAssertion || hasTrailingAssertion) {
      firstAlt.elements = firstAltEls.slice(clippedStart, clippedEnd);
      const nodes: Array<Node> = [];
      if (hasLeadingAssertion) {
        // Could use `insertBefore` if the traverser supported it
        nodes.push(leading);
      }
      nodes.push(node);
      if (hasTrailingAssertion) {
        // Could use `insertAfter` if the traverser supported it
        nodes.push(trailing);
      }
      replaceWithMultiple(nodes, {traverse: true});
    }
  },
};

export {
  exposeAnchors,
};

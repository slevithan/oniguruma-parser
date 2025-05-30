import type {Node} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';

/**
Pull leading and trailing assertions out of capturing groups when possible; helps group unwrapping.
Ex: `(^abc$)` -> `^(abc)$`.
Ex: `(\b(?:a|bc)\b)` -> `\b((?:a|bc))\b`. The inner group can subsequently be unwrapped.
*/
const exposeAnchors: Visitor = {
  // Done for capturing groups only because they can't be unwrapped like noncapturing groups (done
  // via `unwrapUselessGroups` combined with `removeUselessFlags`; the latter also avoids hazards
  // from flags that modify word boundary and text segment boundary assertions that would need to
  // be handled here since noncapturing groups can specify flags to change). Pulling anchors out
  // can subsequently enable unwrapping multi-alternative noncapturing groups within the capturing
  // group, and has the side benefit that exposed anchors also improve readability
  CapturingGroup({node, parent, replaceWithMultiple}) {
    if (
      parent.type === 'Quantifier' ||
      node.body.length > 1 || // Multiple alts
      node.isSubroutined
    ) {
      return;
    }
    const firstAlt = node.body[0];
    const firstAltEls = firstAlt.body;
    // Despite only pulling one assertion at a time, multiple can be extracted through multiple
    // rounds of running this optimization
    const leading = firstAltEls[0];
    const trailing = firstAltEls.length > 1 ? firstAltEls.at(-1)! : null;
    const hasLeadingAssertion = leading && leading.type === 'Assertion';
    const hasTrailingAssertion = trailing && trailing.type === 'Assertion';
    const clippedStart = hasLeadingAssertion ? 1 : 0;
    const clippedEnd = firstAltEls.length - (hasTrailingAssertion ? 1 : 0);
    if (hasLeadingAssertion || hasTrailingAssertion) {
      firstAlt.body = firstAltEls.slice(clippedStart, clippedEnd);
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

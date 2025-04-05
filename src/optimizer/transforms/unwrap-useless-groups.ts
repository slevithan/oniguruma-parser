import type {AlternativeContainerNode, AlternativeElementNode, GroupNode, NodeType, QuantifiableNode, QuantifierNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';
import {isAlternativeContainer, quantifiableTypes} from '../../parser/node-utils.js';

/**
Unwrap nonbeneficial noncapturing and atomic groups.
*/
const unwrapUselessGroups: Visitor = {
  // Unwrap kid from the outside in, since the traverser doesn't support stepping multiple levels
  // up the tree
  '*'({node}: Path) {
    if (!isAlternativeContainer(node)) {
      return;
    }
    if (hasNoncapturingMultiAltOnlyChild(node)) {
      // Isn't needed in some cases like if `node` is itself a basic noncapturing group (since
      // there's already handling in `Group`), but it doesn't hurt to handle it here instead
      node.alternatives = (node.alternatives[0].elements[0] as GroupNode).alternatives;
    }
  },

  Group(path: Path) {
    const {node, parent, replaceWithMultiple} = path as Path<GroupNode>;
    const {alternatives, atomic, flags} = node;
    const firstAltEls = alternatives[0].elements;
    if (alternatives.length > 1 || parent!.type === 'Quantifier') {
      return;
    }
    let unwrap = false;
    if (atomic) {
      if (firstAltEls.every(({type}: AlternativeElementNode) => atomicTypes.has(type))) {
        unwrap = true;
      }
    } else if (flags) {
      // Rely on `removeUselessFlags`, then the group can be unwrapped in a subsequent pass
    } else {
      unwrap = true;
    }
    if (unwrap) {
      replaceWithMultiple(firstAltEls, {traverse: true});
    }
  },

  // Unwrap quantified groups that contain a single quantifiable node
  Quantifier(path: Path) {
    const {node} = path as Path<QuantifierNode>;
    if (node.element.type !== 'Group') {
      return;
    }
    const quantifiedGroup = node.element;
    if (quantifiedGroup.alternatives.length > 1) {
      return;
    }
    const groupKids = quantifiedGroup.alternatives[0].elements;
    if (groupKids.length !== 1) {
      return;
    }
    const candidate = groupKids[0] as QuantifiableNode;
    if (
      !quantifiableTypes.has(candidate.type) ||
      (quantifiedGroup.atomic && !atomicTypes.has(candidate.type)) ||
      quantifiedGroup.flags
    ) {
      return;
    }
    // Make the only child of the group the new element of the quantifier
    node.element = candidate;
  },
};

const atomicTypes = new Set<NodeType>([
  'Assertion',
  'Backreference',
  'Character',
  'CharacterClass',
  'CharacterSet',
  'Directive',
]);

function hasNoncapturingMultiAltOnlyChild(node: AlternativeContainerNode): boolean {
  const alts = node.alternatives;
  const firstAltEls = alts[0].elements;
  return (
    alts.length === 1 &&
    firstAltEls.length === 1 &&
    firstAltEls[0].type === 'Group' &&
    !firstAltEls[0].atomic &&
    !firstAltEls[0].flags &&
    firstAltEls[0].alternatives.length > 1
  );
}

export {
  unwrapUselessGroups,
};

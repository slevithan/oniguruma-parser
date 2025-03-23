import {quantifiableTypes} from '../../parser/node-utils.js';
import {NodeTypes} from '../../parser/parse.js';
import type {AlternativeElementNode, GroupNode, NodeType, QuantifiableNode, QuantifierNode} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';

/**
Unwrap nonbeneficial noncapturing and atomic groups.
*/
const unwrapUselessGroups = {
  Group({node, parent, replaceWithMultiple}: Path & {node: GroupNode}) {
    const {alternatives, atomic, flags} = node;
    if (alternatives.length > 1 || parent.type === NodeTypes.Quantifier) {
      return;
    }
    const els = alternatives[0].elements;
    let unwrap = false;

    if (atomic) {
      if (els.every(({type}: AlternativeElementNode) => atomicTypes.has(type))) {
        unwrap = true;
      }
    } else if (flags) {
      // Rely on `removeUselessFlags`, then the group can be unwrapped in a subsequent pass
    } else {
      unwrap = true;
    }

    if (unwrap) {
      replaceWithMultiple(els, {traverse: true});
    }
  },

  Quantifier({node}: Path & {node: QuantifierNode}) {
    if (node.element.type !== NodeTypes.Group) {
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
    const candidate = <QuantifiableNode>groupKids[0];
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
  NodeTypes.Assertion,
  NodeTypes.Backreference,
  NodeTypes.Character,
  NodeTypes.CharacterClass,
  NodeTypes.CharacterSet,
  NodeTypes.Directive,
]);

export {
  unwrapUselessGroups,
};

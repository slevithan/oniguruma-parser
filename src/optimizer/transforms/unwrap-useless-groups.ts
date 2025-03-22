import {atomicTypes, quantifiableTypes} from '../../parser/node-utils.js';
import {NodeTypes, type AlternativeElementNode, type GroupNode, type QuantifiableNode, type QuantifierNode} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';

/**
Unwrap nonbeneficial noncapturing and atomic groups.
*/
const unwrapUselessGroups = {
  Group({node, parent, replaceWithMultiple}: Path & {node: GroupNode;}) {
    const {alternatives, atomic, flags} = node;
    if (alternatives.length > 1 || parent.type === NodeTypes.Quantifier) {
      return;
    }
    const els = alternatives[0].elements;
    let unwrap = false;

    if (atomic) {
      if (els.every(({type}: AlternativeElementNode & {type: "Assertion" | "Backreference" | "Character" | "CharacterClass" | "CharacterSet" | "Directive";}) => atomicTypes.has(type))) {
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

  Quantifier({node}: Path & {node: QuantifierNode;}) {
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
      //@ts-ignore TODO: shutup TS
      !quantifiableTypes.has(candidate.type) ||
      //@ts-ignore TODO: shutup TS
      (quantifiedGroup.atomic && !atomicTypes.has(candidate.type)) ||
      quantifiedGroup.flags
    ) {
      return;
    }
    // Make the only child of the group the new element of the quantifier
    node.element = candidate;
  },
};

export {
  unwrapUselessGroups,
};

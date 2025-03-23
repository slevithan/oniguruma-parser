import {alternativeContainerTypes} from '../../parser/node-utils.js';
import {createAlternative, createGroup, NodeTypes} from '../../parser/parse.js';
import type {AlternativeContainerNode, Node, NodeType} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';

/**
Extract nodes at the start of every alternative into a prefix.
Also works within groups.
- `^aa|^abb|^ac` -> `^a(?:a|bb|c)`
- `aa|aa|aa` -> `aa`
- `a|b|c` -> `a|b|c` (no common prefix)
*/
const extractPrefix = {
  '*'({node}: Path & {node: AlternativeContainerNode}) {
    if (!alternativeContainerTypes.has(node.type) || node.alternatives.length < 2) {
      return;
    }
    const prefixNodes = [];
    let passedSharedPrefix = false;
    let i = 0;
    while (!passedSharedPrefix) {
      prefixNodes[i] = node.alternatives[0].elements[i];
      for (const alt of node.alternatives) {
        const kid = alt.elements[i];
        if (!kid || !isAllowedSimpleType(kid.type) || !isNodeEqual(kid, prefixNodes[i])) {
          passedSharedPrefix = true;
          break;
        }
      }
      i++;
    }
    prefixNodes.pop();
    if (!prefixNodes.length) {
      return;
    }
    for (const alt of node.alternatives) {
      alt.elements = alt.elements.slice(prefixNodes.length);
    }
    const newContents = createAlternative();
    newContents.elements = [...prefixNodes];
    const suffixGroup = createGroup();
    suffixGroup.alternatives = node.alternatives;
    if (!suffixGroup.alternatives.every(alt => !alt.elements.length)) {
      newContents.elements.push(suffixGroup);
    }
    node.alternatives = [newContents];
  },
};

function isAllowedSimpleType(type: NodeType) {
  return (
    type === NodeTypes.Assertion ||
    type === NodeTypes.Character ||
    type === NodeTypes.CharacterSet
  );
}

// [TODO] Add support for more node types and move to `src/parser/`
function isNodeEqual(a: Node, b: Node) {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === NodeTypes.Assertion || a.type === NodeTypes.CharacterSet) {
    // @ts-expect-error
    return a.kind === b.kind && a.negate === b.negate;
  }
  if (a.type === NodeTypes.Character) {
    // @ts-expect-error
    return a.value === b.value;
  }
  // Only supports types from `isAllowedSimpleType`
  throw new Error(`Unexpected node type "${a.type}"`);
}

export {
  extractPrefix,
  isAllowedSimpleType,
  isNodeEqual,
};

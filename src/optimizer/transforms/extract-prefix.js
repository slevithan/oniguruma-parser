import {createAlternative, createGroup, NodeTypes} from '../../parser/parse.js';
import {alternativeContainerTypes} from '../../parser/node-types.js';

/**
Extract nodes at the start of every alternative into a prefix.
*/
const extractPrefix = {
  '*'({node}) {
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
        if (
          !kid ||
          ( kid.type !== NodeTypes.Assertion &&
            kid.type !== NodeTypes.Character &&
            kid.type !== NodeTypes.CharacterSet
          ) ||
          !isNodeEqual(kid, prefixNodes[i])
        ) {
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

function isNodeEqual(a, b) {
  if (a.type !== b.type) {
    return false;
  }
  if (a.type === NodeTypes.Assertion || a.type === NodeTypes.CharacterSet) {
    return a.kind === b.kind && a.negate === b.negate;
  }
  if (a.type === NodeTypes.Character) {
    return a.value === b.value;
  }
  throw new Error(`Unexpected node type "${a.type}"`);
}

export {
  extractPrefix,
};

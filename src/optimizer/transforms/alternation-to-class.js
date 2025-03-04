import {createAlternative, createCharacterClass, NodeTypes} from '../../parser/parse.js';
import {alternativeContainerTypes} from '../../parser/node-types.js';

/**
Use character classes for adjacent alternatives with single-length values.
*/
const alternationToClass = {
  '*'({node}) {
    if (!alternativeContainerTypes.has(node.type)) {
      return;
    }
    const newAlts = [];
    let ccNodes = [];
    for (const alt of node.alternatives) {
      const kid = alt.elements[0];
      if (
        alt.elements.length === 1 &&
        ( kid.type === NodeTypes.Character ||
          kid.type === NodeTypes.CharacterClass ||
          (kid.type === NodeTypes.CharacterSet && !kid.variableLength)
        )
      ) {
        ccNodes.push(kid);
      } else {
        if (ccNodes.length) {
          newAlts.push(createAlternativeWithCombinedNodes(ccNodes));
          ccNodes = [];
        }
        newAlts.push(alt);
      }
    }
    if (ccNodes.length) {
      newAlts.push(createAlternativeWithCombinedNodes(ccNodes));
    }
    node.alternatives = newAlts;
  },
};

function createAlternativeWithCombinedNodes(nodes) {
  const alt = createAlternative();
  let node = nodes[0];
  if (nodes.length > 1) {
    const cc = createCharacterClass();
    cc.elements = nodes;
    node = cc;
  }
  if (node) {
    alt.elements.push(node);
  }
  return alt;
}

export {
  alternationToClass,
};

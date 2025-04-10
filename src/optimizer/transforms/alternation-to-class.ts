import type {AlternativeNode, CharacterClassNode, CharacterNode, CharacterSetNode} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';
import {isAlternativeContainer, universalCharacterSetKinds} from '../../parser/node-utils.js';
import {createAlternative, createCharacterClass} from '../../parser/parse.js';

/**
Use character classes for adjacent alternatives with single-length values.
*/
const alternationToClass: Visitor = {
  '*'({node}) {
    if (!isAlternativeContainer(node)) {
      return;
    }
    const newAlts = [];
    let ccNodes = [];
    for (const alt of node.body) {
      const kid = alt.body[0];
      if (
        alt.body.length === 1 &&
        ( kid.type === 'Character' ||
          kid.type === 'CharacterClass' ||
          (kid.type === 'CharacterSet' && universalCharacterSetKinds.has(kid.kind))
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
    node.body = newAlts;
  },
};

function createAlternativeWithCombinedNodes(nodes: Array<CharacterNode | CharacterClassNode | CharacterSetNode>): AlternativeNode {
  const alt = createAlternative();
  const node = nodes.length > 1 ? createCharacterClass({body: nodes}) : nodes[0];
  if (node) {
    alt.body.push(node);
  }
  return alt;
}

export {
  alternationToClass,
};

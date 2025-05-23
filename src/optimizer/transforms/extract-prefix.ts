import type {AssertionNode, CharacterNode, CharacterSetNode, Node} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';
import {isAlternativeContainer} from '../../parser/node-utils.js';
import {createAlternative, createGroup} from '../../parser/parse.js';

/**
Extract nodes at the start of every alternative into a prefix.
Ex: `^aa|^abb|^ac` -> `^a(?:a|bb|c)`.
Also works within groups.
*/
const extractPrefix: Visitor = {
  '*'({node}) {
    if (!isAlternativeContainer(node) || node.body.length < 2) {
      return;
    }
    const prefixNodes = [];
    let passedSharedPrefix = false;
    let i = 0;
    while (!passedSharedPrefix) {
      prefixNodes.push(node.body[0].body[i]);
      for (const alt of node.body) {
        const kid = alt.body[i];
        if (!kid || !isAllowedSimpleNode(kid) || !isNodeEqual(kid, prefixNodes[i])) {
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

    for (const alt of node.body) {
      alt.body = alt.body.slice(prefixNodes.length);
    }
    const newContentsAlt = createAlternative({body: prefixNodes});
    const suffixGroup = createGroup({body: node.body});
    if (!suffixGroup.body.every(alt => !alt.body.length)) {
      newContentsAlt.body.push(suffixGroup);
    }
    node.body = [newContentsAlt];
  },
};

function isAllowedSimpleNode(node: Node) {
  return (
    node.type === 'Assertion' ||
    node.type === 'Character' ||
    node.type === 'CharacterSet'
  );
}

// TODO: Add support for more node types and move to `src/parser/node-utils.ts`
function isNodeEqual(a: Node, b: Node): boolean {
  if (a.type !== b.type) {
    // TS doesn't understand that this makes `a` and `b` always have the same type, so we'll still
    // need to cast, later
    return false;
  }
  if (a.type === 'Assertion' || a.type === 'CharacterSet') {
    return (
      a.kind === (b as AssertionNode | CharacterSetNode).kind &&
      a.negate === (b as AssertionNode | CharacterSetNode).negate
    );
  }
  if (a.type === 'Character') {
    return a.value === (b as CharacterNode).value;
  }
  // Only supports types from `isAllowedSimpleNode`
  throw new Error(`Unexpected node type "${a.type}"`);
}

export {
  extractPrefix,
  isAllowedSimpleNode,
  isNodeEqual,
};

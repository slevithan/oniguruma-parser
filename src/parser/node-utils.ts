import {NodeCharacterSetKinds} from './parse.js';
import type {Node, NodeType} from './parse.js';

const alternativeContainerTypes = new Set<NodeType>([
  'AbsentFunction',
  'CapturingGroup',
  'Group',
  'LookaroundAssertion',
  'Pattern',
]);

const quantifiableTypes = new Set<NodeType>([
  'AbsentFunction',
  'Backreference',
  'CapturingGroup',
  'Character',
  'CharacterClass',
  'CharacterSet',
  'Group',
  'Quantifier',
  'Subroutine',
]);

// Character set kinds that can appear inside and outside of character classes, and can be inverted
// by setting `negate`. Some but not all of those excluded use `variableLength: true`
const universalCharacterSetKinds = new Set<keyof typeof NodeCharacterSetKinds>([
  NodeCharacterSetKinds.digit,
  NodeCharacterSetKinds.hex,
  NodeCharacterSetKinds.posix,
  NodeCharacterSetKinds.property,
  NodeCharacterSetKinds.space,
  NodeCharacterSetKinds.word,
]);

type Props = {[key: string]: any};

function hasOnlyChild(node: Node, props?: Props): boolean {
  // [TODO] Add support for nodes with `alternatives`; look for `elements` within the first alt
  // after checking that there's only one alt
  if (!('elements' in node)) {
    throw new Error('Expected node with elements');
  }
  if (node.elements.length !== 1) {
    return false;
  }
  const kid = node.elements[0] as Props;
  return !props || Object.keys(props).every(key => props[key] === kid[key]);
}

export {
  alternativeContainerTypes,
  hasOnlyChild,
  quantifiableTypes,
  universalCharacterSetKinds,
};

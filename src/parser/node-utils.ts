import {NodeCharacterSetKinds, NodeTypes} from './parse.js';
import type {Node, NodeType} from './parse.js';

const alternativeContainerTypes = new Set<NodeType>([
  NodeTypes.AbsentFunction,
  NodeTypes.CapturingGroup,
  NodeTypes.Group,
  NodeTypes.LookaroundAssertion,
  NodeTypes.Pattern,
]);

const quantifiableTypes = new Set<NodeType>([
  NodeTypes.AbsentFunction,
  NodeTypes.Backreference,
  NodeTypes.CapturingGroup,
  NodeTypes.Character,
  NodeTypes.CharacterClass,
  NodeTypes.CharacterSet,
  NodeTypes.Group,
  NodeTypes.Quantifier,
  NodeTypes.Subroutine,
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

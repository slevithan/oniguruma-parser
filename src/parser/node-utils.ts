import type {AlternativeContainerNode, Node, NodeCharacterSetKind, NodeType} from './parse.js';

const quantifiableTypes = new Set<NodeType>([
  'AbsenceFunction',
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
const universalCharacterSetKinds = new Set<NodeCharacterSetKind>([
  'digit',
  'hex',
  'posix',
  'property',
  'space',
  'word',
]);

type Props = {[key: string]: any};

function hasOnlyChild(node: Node, props?: Props): boolean {
  // TODO: Add support for nodes with `alternatives`; look for `elements` within the first alt
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

function isAlternativeContainer(node: Node): node is AlternativeContainerNode {
  const alternativeContainerTypes = new Set<NodeType>([
    'AbsenceFunction',
    'CapturingGroup',
    'Group',
    'LookaroundAssertion',
    'Pattern',
  ]);
  if (
    !alternativeContainerTypes.has(node.type) ||
    (node.type === 'AbsenceFunction' && node.kind !== 'repeater')
  ) {
    return false;
  }
  return true;
}

export {
  hasOnlyChild,
  isAlternativeContainer,
  quantifiableTypes,
  universalCharacterSetKinds,
};

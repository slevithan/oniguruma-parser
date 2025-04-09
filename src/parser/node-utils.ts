import type {AlternativeContainerNode, Node, NodeCharacterSetKind, NodeType, ParentNode} from './parse.js';

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

type KeysOfUnion<T> = T extends T ? keyof T: never;
type Props = {[key in KeysOfUnion<Node>]?: any};

function hasOnlyChild(node: ParentNode & {body: Array<Node>}, props?: Props): boolean {
  if (!Array.isArray(node.body)) {
    throw new Error('Expected node with body array');
  }
  if (node.body.length !== 1) {
    return false;
  }
  const kid = node.body[0] as Props;
  return !props || Object.keys(props).every(key => props[key as keyof Props] === kid[key as keyof Props]);
}

function isAlternativeContainer(node: Node): node is AlternativeContainerNode {
  const alternativeContainerTypes = new Set<NodeType>([
    'AbsenceFunction',
    'CapturingGroup',
    'Group',
    'LookaroundAssertion',
    'Regex',
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

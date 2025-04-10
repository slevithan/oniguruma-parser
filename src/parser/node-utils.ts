import type {AlternativeContainerNode, Node, NodeCharacterSetKind, ParentNode, QuantifiableNode} from './parse.js';

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
  if (
    !alternativeContainerTypes.has(node.type) ||
    (node.type === 'AbsenceFunction' && node.kind !== 'repeater')
  ) {
    return false;
  }
  return true;
}
const alternativeContainerTypes = new Set<Node['type']>([
  'AbsenceFunction',
  'CapturingGroup',
  'Group',
  'LookaroundAssertion',
  'Regex',
]);

function isQuantifiable(node: Node): node is QuantifiableNode {
  return quantifiableTypes.has(node.type);
}
const quantifiableTypes = new Set<Node['type']>([
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

export {
  hasOnlyChild,
  isAlternativeContainer,
  isQuantifiable,
};

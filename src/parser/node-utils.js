import {NodeCharacterSetKinds, NodeTypes} from './parse.js';

const alternativeContainerTypes = new Set([
  NodeTypes.AbsentFunction,
  NodeTypes.CapturingGroup,
  NodeTypes.Group,
  NodeTypes.LookaroundAssertion,
  NodeTypes.Pattern,
]);

const atomicTypes = new Set([
  NodeTypes.Assertion,
  NodeTypes.Backreference,
  NodeTypes.Character,
  NodeTypes.CharacterClass,
  NodeTypes.CharacterSet,
  NodeTypes.Directive,
]);

const quantifiableTypes = new Set([
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
const universalCharacterSetKinds = new Set([
  NodeCharacterSetKinds.digit,
  NodeCharacterSetKinds.hex,
  NodeCharacterSetKinds.posix,
  NodeCharacterSetKinds.property,
  NodeCharacterSetKinds.space,
  NodeCharacterSetKinds.word,
]);

function hasOnlyChild(node, properties = {}) {
  // [TODO] Add support for nodes with `alternatives`, looking for `elements` within the first
  // alternative after checking that there's only one alternative
  if (!node.elements) {
    throw new Error('Expected node with elements');
  }
  if (node.elements.length !== 1) {
    return false;
  }
  const kid = node.elements[0];
  for (const key of Object.keys(properties)) {
    if (kid[key] !== properties[key]) {
      return false;
    }
  }
  return true;
}

export {
  alternativeContainerTypes,
  atomicTypes,
  hasOnlyChild,
  quantifiableTypes,
  universalCharacterSetKinds,
};

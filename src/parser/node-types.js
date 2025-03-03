import {NodeTypes} from './parse.js';

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

export {
  atomicTypes,
  quantifiableTypes,
};

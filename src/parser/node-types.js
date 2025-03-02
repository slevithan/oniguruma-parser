import {AstTypes} from './parse.js';

const atomicTypes = new Set([
  AstTypes.Assertion,
  AstTypes.Backreference,
  AstTypes.Character,
  AstTypes.CharacterClass,
  AstTypes.CharacterSet,
  AstTypes.Directive,
]);

const quantifiableTypes = new Set([
  AstTypes.AbsentFunction,
  AstTypes.Backreference,
  AstTypes.CapturingGroup,
  AstTypes.Character,
  AstTypes.CharacterClass,
  AstTypes.CharacterSet,
  AstTypes.Group,
  AstTypes.Quantifier,
  AstTypes.Subroutine,
]);

export {
  atomicTypes,
  quantifiableTypes,
};

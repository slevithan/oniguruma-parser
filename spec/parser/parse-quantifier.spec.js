import {createCharacter, createQuantifier, parse} from '../../dist/parser/parse.js';
import {cpOf, r} from '../../dist/utils.js';
import {singleAltAst} from '../support/spec-utils.js';

describe('Parser: Quantifier', () => {
  function star(element) {
    return createQuantifier('greedy', 0, Infinity, element);
  }

  it('should parse quantifiers', () => {
    expect(parse('a*')).toEqual(singleAltAst([
      star(createCharacter(cpOf('a'))),
    ]));
  });

  it('should parse quantifier chains', () => {
    expect(parse('a**')).toEqual(singleAltAst([
      star(star(createCharacter(cpOf('a')))),
    ]));
  });

  it('should throw when quantifying an unquantifiable node', () => {
    const cases = [
      '*',
      '|*',
      '(?:*)',
      '^*',
      '(?i)*',
      r`\K*`,
      '(?=)*',
      '(*FAIL)*',
    ];
    for (const input of cases) {
      expect(() => parse(input)).toThrow();
    }
  });
});

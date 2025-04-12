import type {NodeQuantifierKind, QuantifiableNode, QuantifierNode} from '../../dist/parser/parse.js';
import {createCharacterSet, createQuantifier, parse} from '../../dist/parser/parse.js';
import {r} from '../../dist/utils.js';
import {singleAltAst} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Parser: Quantifier', () => {
  function star(body: QuantifiableNode, kind?: NodeQuantifierKind): QuantifierNode {
    return createQuantifier(kind ?? 'greedy', 0, Infinity, body);
  }
  function qMark(body: QuantifiableNode, kind?: NodeQuantifierKind): QuantifierNode {
    return createQuantifier(kind ?? 'greedy', 0, 1, body);
  }

  it('should parse quantifiers', () => {
    expect(parse('.*')).toEqual(singleAltAst([
      star(createCharacterSet('dot')),
    ]));
  });

  it('should parse quantifier chains', () => {
    expect(parse('.**')).toEqual(singleAltAst([
      star(star(createCharacterSet('dot'))),
    ]));
  });

  it('should parse reversed (possessive) interval quantifiers', () => {
    expect(parse('.{1,0}')).toEqual(singleAltAst([
      createQuantifier('possessive', 0, 1, createCharacterSet('dot')),
    ]));
    // Special case: `?` isn't a lazy-suffix
    expect(parse('.{1,0}?')).toEqual(singleAltAst([
      qMark(createQuantifier('possessive', 0, 1, createCharacterSet('dot'))),
    ]));
    expect(parse('.{1,0}??')).toEqual(singleAltAst([
      qMark(createQuantifier('possessive', 0, 1, createCharacterSet('dot')), 'lazy'),
    ]));
    expect(parse('.{1,0}?+')).toEqual(singleAltAst([
      qMark(createQuantifier('possessive', 0, 1, createCharacterSet('dot')), 'possessive'),
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

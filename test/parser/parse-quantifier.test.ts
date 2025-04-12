import type {AlternativeElementNode, NodeQuantifierKind, QuantifiableNode} from '../../dist/parser/parse.js';
import {createCharacterSet, createQuantifier, parse} from '../../dist/parser/parse.js';
import {r} from '../../dist/utils.js';
import {singleAltAst} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

const dot = createCharacterSet('dot');
const qMark = (body: QuantifiableNode, kind: NodeQuantifierKind = 'greedy') =>
  createQuantifier(kind, 0, 1, body);
const star = (body: QuantifiableNode, kind: NodeQuantifierKind = 'greedy') =>
  createQuantifier(kind, 0, Infinity, body);
const single = (node: AlternativeElementNode) => singleAltAst([node]);

describe('Parser: Quantifier', () => {
  it('should parse quantifiers', () => {
    expect(parse('.*')).toEqual(single(star(dot)));
  });

  it('should parse quantifier chains', () => {
    expect(parse('.**')).toEqual(single(star(star(dot))));
  });

  it('should parse reversed (possessive) interval quantifiers', () => {
    const possessive0To1 = createQuantifier('possessive', 0, 1, dot);
    expect(parse('.{1,0}')).toEqual(single(possessive0To1));
    // Special case: `?` isn't a lazy-suffix
    expect(parse('.{1,0}?')).toEqual(single(qMark(possessive0To1)));
    expect(parse('.{1,0}??')).toEqual(single(qMark(possessive0To1, 'lazy')));
    expect(parse('.{1,0}?+')).toEqual(single(qMark(possessive0To1, 'possessive')));
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
      '(?<=)*',
      '(*FAIL)*',
    ];
    for (const input of cases) {
      expect(() => parse(input)).toThrow();
    }
  });
});

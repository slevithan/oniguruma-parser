import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: extractPrefix', () => {
  const thisOptimization = getNarrowOptimizer('extractPrefix');

  it('should extract a prefix found in all alternatives', () => {
    const cases = [
      ['^a|^b', '^(?:a|b)'],
      [r`\da|\db|\dc`, r`\d(?:a|b|c)`],
      ['^aa|^abb|^ac', '^a(?:a|bb|c)'],
      ['^a|^ab|^ac', '^a(?:|b|c)'],
      ['^aa|^a|^ac', '^a(?:a||c)'],
      ['aa|aa', 'aa'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should apply within groups', () => {
    const cases = [
      ['(aa|ab)', '(a(?:a|b))'],
      ['(?<n>aa|ab)', '(?<n>a(?:a|b))'],
      ['(?:aa|ab)', '(?:a(?:a|b))'],
      ['(?i:aa|ab)', '(?i:a(?:a|b))'],
      ['(?>aa|ab)', '(?>a(?:a|b))'],
      ['(?=aa|ab)', '(?=a(?:a|b))'],
      ['(?~aa|ab)', '(?~a(?:a|b))'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not apply when a shared prefix is not found', () => {
    const cases = [
      'a',
      'a|b',
      'aa|ba',
      'aa|ab|',
      'aa|ab|ca',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Just documenting current behavior
  it('should not consider non-simple nodes for the prefix', () => {
    const cases = [
      ['(a)a|(a)b'],
      ['[a]a|[a]b'],
      [r`\Ka|\Kb`],
      ['^[a]a|^[a]a', '^(?:[a]a|[a]a)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected ?? input);
    }
  });
});

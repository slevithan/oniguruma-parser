import {getOptionalOptimizations, optimize} from '../../dist/optimizer/optimize.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: removeUselessFlags', () => {
  const thisOverride = {
    ...getOptionalOptimizations({disable: true}),
    removeUselessFlags: true,
  };
  const thisOptimization = getNarrowOptimizer('removeUselessFlags');

  it('should remove useless flags from groups', () => {
    const cases = [
      ['(?x:a)', '(?:a)'],
      ['(?-x:a)', '(?:a)'],
      ['(?x-x:a)', '(?:a)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not remove necessary flags from groups', () => {
    const cases = [
      '(?i:a)',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should remove useless flags from flag directives', () => {
    const cases = [
      ['(?x)a', 'a'],
      ['(?-x)a', 'a'],
      ['(?x-x)a', 'a'],
      ['(?ix)a', '(?i)a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not remove necessary flags from flag directives', () => {
    const cases = [
      '(?i)a',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should remove useless top-level flags', () => {
    expect(optimize('a', {
      flags: 'ix',
      override: thisOverride,
    }).flags).toBe('i');
  });
});

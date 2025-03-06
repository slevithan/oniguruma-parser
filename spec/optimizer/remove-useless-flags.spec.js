import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';

describe('Optimizer: removeUselessFlags', () => {
  function thisOptimizationObj(pattern, options) {
    return optimize(pattern, {
      ...options,
      override: {
        ...getOptionalOptimizations({disable: true}),
        removeUselessFlags: true,
      },
    });
  }
  function thisOptimization(pattern) {
    return thisOptimizationObj(pattern).pattern;
  }

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
    expect(thisOptimizationObj('a', {flags: 'ix'}).flags).toBe('i');
  });
});

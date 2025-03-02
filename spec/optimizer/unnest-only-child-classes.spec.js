import {optimize, getAllOptimizations} from '../../dist/optimizer/optimize.js';

describe('Optimizer: unnestOnlyChildClasses', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getAllOptimizations({disable: true}),
        unnestOnlyChildClasses: true,
      },
    }).pattern;
  }

  it('should unnest only-child character classes', () => {
    const cases = [
      ['[[a]]', '[a]'],
      ['[[[a]]]', '[a]'],
      ['[[ab]]', '[ab]'],
      ['[[^a]]', '[^a]'],
      ['[^[a]]', '[^a]'],
      ['[^[^a]]', '[a]'],
      ['[^[^[a]]]', '[a]'],
      ['[^[^[^a]]]', '[^a]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not unnest non-only-child character classes', () => {
    const cases = [
      '[a]',
      '[[a]b]',
      '[a[b]]',
      '[[a][b]]',
      '[[:alpha:]]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

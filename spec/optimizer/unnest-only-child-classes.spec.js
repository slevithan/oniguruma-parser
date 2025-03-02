import {optimize} from '../../dist/optimizer/optimize.js';

describe('optimizer: unnestOnlyChildClasses', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {allow: ['unnestOnlyChildClasses']}).pattern;
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

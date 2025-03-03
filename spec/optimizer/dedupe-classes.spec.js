import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: dedupeClasses', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        dedupeClasses: true,
      },
    }).pattern;
  }

  it('should dedupe characters in classes', () => {
    const cases = [
      ['[a]', '[a]'],
      ['[aa]', '[a]'],
      ['[aaa]', '[a]'],
      [r`[a\x61]`, '[a]'],
      ['[aba]', '[ab]'],
      ['[a[a]a]', '[a[a]]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should dedupe character sets in classes', () => {
    const cases = [
      [r`[\s]`, r`[\s]`],
      [r`[\s\s]`, r`[\s]`],
      [r`[\s\s\s]`, r`[\s]`],
      [r`[[:word:]\p{word}]`, '[[:word:]]'],
      [r`[\s\S\s]`, r`[\s\S]`],
      [r`[\s[\s]\s]`, r`[\s[\s]]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should dedupe ranges in classes', () => {
    const cases = [
      ['[a-z]', '[a-z]'],
      ['[a-za-z]', '[a-z]'],
      ['[a-za-za-z]', '[a-z]'],
      [r`[a-z\x61-\x7A]`, '[a-z]'],
      ['[a-zA-Za-z]', '[a-zA-Z]'],
      ['[a-z[a-z]a-z]', '[a-z[a-z]]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not dedupe intersection', () => {
    const cases = [
      '[a&&a]',
      r`[\s&&\s]`,
      '[a-z&&a-z]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not dedupe across different classes', () => {
    const cases = [
      '[a][a]',
      '[a[a]]',
      '[[a]a]',
      '[[a][a]]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: extractSuffix', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        extractSuffix: true,
      },
    }).pattern;
  }

  it('should extract a suffix found in all alternatives', () => {
    const cases = [
      ['a$|b$', '(?:a|b)$'],
      [r`a\d|b\d|c\d`, r`(?:a|b|c)\d`],
      ['aa$|bba$|ca$', '(?:a|bb|c)a$'],
      ['a$|ba$|ca$', '(?:|b|c)a$'],
      ['aa$|a$|ca$', '(?:a||c)a$'],
      ['aa|aa', 'aa'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should apply within groups', () => {
    const cases = [
      ['(aa|ba)', '((?:a|b)a)'],
      ['(?<n>aa|ba)', '(?<n>(?:a|b)a)'],
      ['(?:aa|ba)', '(?:(?:a|b)a)'],
      ['(?i:aa|ba)', '(?i:(?:a|b)a)'],
      ['(?>aa|ba)', '(?>(?:a|b)a)'],
      ['(?=aa|ba)', '(?=(?:a|b)a)'],
      ['(?~aa|ba)', '(?~(?:a|b)a)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not apply when a shared suffix is not found', () => {
    const cases = [
      'a',
      'a|b',
      'aa|ab',
      'aa|ba|',
      'aa|ba|ac',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Just documenting current behavior
  it('should not consider non-simple nodes for the suffix', () => {
    const cases = [
      'a(a)|b(a)',
      'a[a]|b[a]',
      r`a\K|b\K`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
    const changes = [
      ['a[a]$|a[a]$', '(?:a[a]|a[a])$'],
    ];
    for (const [input, expected] of changes) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

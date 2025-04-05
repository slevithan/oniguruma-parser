import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: extractSuffix', () => {
  const thisOptimization = getNarrowOptimizer('extractSuffix');

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

  it('should not apply if suffix is a single node and unbeneficial', () => {
    const cases = [
      ['true|false'],
      ['true|false|maybe'],
      // Single node suffix allowed
      // - At least four alternatives; net neutral/reduced length
      ['true|false|maybe|sure', '(?:tru|fals|mayb|sur)e'],
      // - Suffix is assertion; allows follow-up optimizations
      [r`big\b|bad\b`, r`(?:big|bad)\b`],
      // - Alternatives reduced to 0 or 1 node; allows follow-up optimizations
      ['aa|ba|ca', '(?:a|b|c)a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected ?? input);
    }
  });

  // Just documenting current behavior
  it('should not consider non-simple nodes for the suffix', () => {
    const cases = [
      ['a(a)|b(a)'],
      ['a[a]|b[a]'],
      [r`a\K|b\K`],
      ['a[a]a$|a[a]a$', '(?:a[a]|a[a])a$'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected ?? input);
    }
  });
});

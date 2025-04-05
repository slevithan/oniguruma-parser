import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: alternationToClass', () => {
  const thisOptimization = getNarrowOptimizer('alternationToClass');

  it('should use classes for adjacent alternatives with single-length values', () => {
    const cases = [
      ['a|b', '[ab]'],
      ['a|b|c', '[abc]'],
      [r`a|b|\d`, r`[ab\d]`],
      [r`\s|\w|\h|\p{L}|\p{word}`, r`[\s\w\h\p{L}[:word:]]`],
      [r`a|b|[c]`, r`[ab[c]]`],
      [r`a|b|[^c]`, r`[ab[^c]]`],
      [r`a|b|[c-d]`, r`[ab[c-d]]`],
      [r`a|b|[c&&d]`, r`[ab[c&&d]]`],
      [r`a|b|[c]|[d]`, r`[ab[c][d]]`],
      [r`a|b|[^c]|[^d]`, r`[ab[^c][^d]]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should apply within groups', () => {
    const cases = [
      ['(a|b)', '([ab])'],
      ['(?:a|b)', '(?:[ab])'],
      ['(?>a|b)', '(?>[ab])'],
      ['(?<n>a|b)', '(?<n>[ab])'],
      ['(?~a|b)', '(?~[ab])'],
      ['(?=a|b)', '(?=[ab])'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not apply to non-combinable values', () => {
    const cases = [
      'a|',
      'a|bc',
      r`a|\R`,
      r`a|\X`,
      'a|(b)',
      'a|^',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not apply to non-classable character sets', () => {
    const cases = [
      'a|.',
      r`a|\O`,
      r`a|\N`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should apply to subsets of alternatives', () => {
    const cases = [
      ['a|b|cd|e|f', '[ab]|cd|[ef]'],
      ['ab|c|d|ef', 'ab|[cd]|ef'],
      [r`^|\s|\W`, r`^|[\s\W]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

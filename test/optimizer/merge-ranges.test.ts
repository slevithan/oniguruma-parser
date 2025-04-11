import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: mergeRanges', () => {
  const thisOptimization = getNarrowOptimizer('mergeRanges');

  it('should merge characters in classes into ranges', () => {
    const cases = [
      ['[a]'],
      ['[ab]'],
      ['[abc]', '[a-c]'],
      ['[abczd]', '[a-dz]'],
      ['[dcab]', '[a-d]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected ?? input);
    }
  });

  it('should merge ranges in classes', () => {
    const cases = [
      ['[a-ca-f]', '[a-f]'],
      ['[a-cb-f]', '[a-f]'],
      ['[a-cc-f]', '[a-f]'],
      ['[a-cd-f]', '[a-f]'],
      ['[a-ce-g]'],
      ['[abcde-gb-ec-x]', '[a-x]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected ?? input);
    }
  });

  it('should collapse ranges of one or two characters', () => {
    const cases = [
      ['[a-a]', '[a]'],
      ['[a-b]', '[ab]'],
      ['[a-c]', '[a-c]'],
      [r`[\x{100000}\x{100001}\x{100002}]`, r`[\x{100000}-\x{100002}]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should sort characters and ranges in classes', () => {
    const cases = [
      [r`[xa!\x00]`, r`[\x00!ax]`],
      ['[h-ja-f]', '[a-fh-j]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should sort "-" and "]" first so they avoid escaping', () => {
    const cases = [
      [r`[\x00\-a]`, r`[-\x00a]`],
      [r`[\x00\]a]`, r`[]\x00a]`],
      [r`[\x00\]\-a]`, r`[-\]\x00a]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

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

  it('should dedupe ranges in classes', () => {
    const cases = [
      ['[a-z]', '[a-z]'],
      ['[a-za-z]', '[a-z]'],
      ['[a-za-za-z]', '[a-z]'],
      [r`[a-z\x61-\x7A]`, '[a-z]'],
      ['[a-zA-Za-z]', '[A-Za-z]'],
      ['[a-z[a-z]a-z]', '[a-z[a-z]]'],
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

  it('should not dedupe intersection', () => {
    const cases = [
      '[a&&a]',
      '[a-z&&a-z]',
      r`[\s&&\s]`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not dedupe across different classes', () => {
    // Nested classes are deduped after they're unnested by separate optimizations
    const cases = [
      '[a][a]',
      '[a[a]]',
      '[[a][a]]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

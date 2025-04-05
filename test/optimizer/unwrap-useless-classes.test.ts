import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: unwrapUselessClasses', () => {
  const thisOptimization = getNarrowOptimizer('unwrapUselessClasses');

  it('should unwrap unnecessary classes', () => {
    const cases = [
      ['[a]', 'a'],
      ['[a]*', 'a*'],
      [r`[\u0061]`, 'a'],
      [r`[\s]`, r`\s`],
      [r`[\S]`, r`\S`],
      ['[.]', r`\.`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  // Handled by `unnestUselessClasses`
  it('should not unwrap nested classes', () => {
    const cases = [
      '[[a]]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Handled by `unwrapNegationWrappers`
  it('should not unwrap negated classes containing an individual set', () => {
    const cases = [
      r`[^\s]`,
      r`[^\S]`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not unwrap necessary classes', () => {
    const cases = [
      '[^a]',
      '[a-z]',
      '[ab]',
      '[^ab]',
      r`[^\sb]`,
      '[a&&a]',
      '[&&]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
    // Unsupported Onig syntax; classes can only be empty if they're implicit in an intersection;
    // ex: on the left side of `[&&a]`
    expect(() => thisOptimization('[]')).toThrow();
  });
});

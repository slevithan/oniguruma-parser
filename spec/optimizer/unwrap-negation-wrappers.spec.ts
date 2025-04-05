import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: unwrapNegationWrappers', () => {
  const thisOptimization = getNarrowOptimizer('unwrapNegationWrappers');

  it('should unwrap outermost negation wrappers', () => {
    const cases = [
      [r`[^\d]`, r`\D`],
      [r`[^\D]`, r`\d`],
      [r`[^\h]`, r`\H`],
      [r`[^\H]`, r`\h`],
      [r`[^\s]`, r`\S`],
      [r`[^\S]`, r`\s`],
      [r`[^\w]`, r`\W`],
      [r`[^\W]`, r`\w`],
      [r`[^\p{L}]`, r`\P{L}`],
      [r`[^\P{L}]`, r`\p{L}`],
      [r`[^[:word:]]`, r`\P{word}`],
      [r`[^[:^word:]]`, r`\p{word}`],
      [r`[^\n]`, r`\N`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should unwrap inner negation wrappers', () => {
    const cases = [
      [r`[[^\d]]`, r`[\D]`],
      [r`[[^\D]]`, r`[\d]`],
      [r`[[^\h]]`, r`[\H]`],
      [r`[[^\H]]`, r`[\h]`],
      [r`[[^\s]]`, r`[\S]`],
      [r`[[^\S]]`, r`[\s]`],
      [r`[[^\w]]`, r`[\W]`],
      [r`[[^\W]]`, r`[\w]`],
      [r`[[^\p{L}]]`, r`[\P{L}]`],
      [r`[[^\P{L}]]`, r`[\p{L}]`],
      [r`[[^[:word:]]]`, r`[[:^word:]]`],
      [r`[[^[:^word:]]]`, r`[[:word:]]`],
      [r`[a[^\d]]`, r`[a\D]`],
      [r`[a[^\D]]`, r`[a\d]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should not unnest negated \n`, () => {
    const cases = [
      r`[[^\n]]`, // Since the class is an only-kid, will be unnested by `unnestUselessClasses`, and can then be unwrapped to `\N`
      r`[a[^\n]]`, // Negated wrapper is required
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it(r`should not unwrap negated \n if it's non-lazily quantified`, () => {
    const allowCases = [
      [r`[^\n]+?`, r`\N+?`],
    ];
    for (const [input, expected] of allowCases) {
      expect(thisOptimization(input)).toBe(expected);
    }
    // Avoid introducing a trigger for an Oniguruma bug; see <github.com/rosshamish/kuskus/issues/209>
    const blockCases = [
      r`[^\n]+`,
      r`[^\n]++`,
    ];
    for (const input of blockCases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

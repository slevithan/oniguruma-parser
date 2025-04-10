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

  it('should unnest and unwrap inner negation wrappers', () => {
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

  // `\n` gets special handling because its inverse `\N` can only be used outside of a class
  it(r`should not unnest negated \n`, () => {
    const cases = [
      // Since the class is an only-kid, it can be unwrapped to `\N` but only after it's unnested by `unnestUselessClasses`
      r`[[^\n]]`,
      // Negation wrapper is required
      r`[a[^\n]]`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should unwrap quantified negation wrappers', () => {
    const cases = [
      [r`[^\d]+`, r`\D+`],
      [r`[^\d]+?`, r`\D+?`],
      [r`[^\d]++`, r`\D++`],
      [r`[a[^\d]]+`, r`[a\D]+`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should not unwrap negated \n if it's non-lazily quantified`, () => {
    const allowCases = [
      [r`[^\n]+?`, r`\N+?`],
    ];
    for (const [input, expected] of allowCases) {
      expect(thisOptimization(input)).toBe(expected);
    }
    // Avoid introducing a trigger for a `vscode-oniguruma` bug (v2.0.1 tested); see
    // <github.com/kkos/oniguruma/issues/347>
    const blockCases = [
      r`[^\n]+`,
      r`[^\n]++`,
    ];
    for (const input of blockCases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

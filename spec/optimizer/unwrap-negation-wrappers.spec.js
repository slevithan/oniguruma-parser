import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: unwrapNegationWrappers', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        unwrapNegationWrappers: true,
      },
    }).pattern;
  }

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
});

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
      [r`[a[^\w]]`, r`[a\W]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

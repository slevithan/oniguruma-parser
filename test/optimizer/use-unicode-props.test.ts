import {getOptionalOptimizations, optimize} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: useUnicodeProps', () => {
  const thisOverride = {
    ...getOptionalOptimizations({disable: true}),
    useUnicodeProps: true,
  };
  const thisOptimization = getNarrowOptimizer('useUnicodeProps');

  it(r`should use \p{Any} in place of range U+0 to U+10FFFF`, () => {
    const cases = [
      [r`[\0-\x{10FFFF}]`, r`[\p{Any}]`],
      [r`[\0-\x{10FFFF}a]`, r`[\p{Any}a]`],
      [r`[\0-\x{10FFFF}&&a]`, r`[\p{Any}&&a]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should use \p{Cc} when possible`, () => {
    const cases = [
      [r`\p{cntrl}`, r`\p{Cc}`],
      [r`\P{cntrl}`, r`\P{Cc}`],
      ['[[:cntrl:]]', r`[\p{Cc}]`],
      ['[[:^cntrl:]]', r`[\P{Cc}]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should not switch to \p{Cc} when using flag P`, () => {
    // `cntrl` only has a POSIX form
    const cases = [
      r`\p{cntrl}`,
      '[[:cntrl:]]',
    ];
    for (const input of cases) {
      expect(optimize(input, {
        flags: 'P',
        override: thisOverride,
      }).pattern).toBe(input);
    }
  });
});

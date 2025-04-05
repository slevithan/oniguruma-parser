import {getOptionalOptimizations, optimize} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: useShorthands', () => {
  const thisOverride = {
    ...getOptionalOptimizations({disable: true}),
    useShorthands: true,
  };
  const thisOptimization = getNarrowOptimizer('useShorthands');

  it(r`should use \d when possible`, () => {
    const cases = [
      [r`\p{Decimal_Number}`, r`\d`],
      [r`\P{Decimal_Number}`, r`\D`],
      [r`\p{Nd}`, r`\d`],
      [r`\p{digit}`, r`\d`],
      ['[[:digit:]]', r`[\d]`],
      ['[[:^digit:]]', r`[\D]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should switch only POSIX forms to \d when using flag D or P`, () => {
    const cases = [
      [r`\p{Decimal_Number}`, r`\p{Decimal_Number}`],
      [r`\p{Nd}`, r`\p{Nd}`],
      [r`\p{digit}`, r`\d`],
      ['[[:digit:]]', r`[\d]`],
    ];
    for (const [input, expected] of cases) {
      expect(optimize(input, {
        flags: 'D',
        override: thisOverride,
      }).pattern).toBe(expected);
      expect(optimize(input, {
        flags: 'P',
        override: thisOverride,
      }).pattern).toBe(expected);
    }
  });

  it(r`should use \h when possible`, () => {
    const cases = [
      [r`\p{ASCII_Hex_Digit}`, r`\h`],
      [r`\P{ASCII_Hex_Digit}`, r`\H`],
      [r`\p{AHex}`, r`\h`],
      [r`\p{xdigit}`, r`\h`],
      ['[[:xdigit:]]', r`[\h]`],
      ['[[:^xdigit:]]', r`[\H]`],
      ['[0-9A-Fa-f]', r`[\h]`],
      ['[^0-9A-Fa-f]', r`[^\h]`],
      ['[A-FA-F=0-9*a-f]', r`[=*\h]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should switch all forms to \h when using flag P`, () => {
    // `\h` only has an ASCII form
    const cases = [
      [r`\p{ASCII_Hex_Digit}`, r`\h`],
      [r`\p{AHex}`, r`\h`],
      [r`\p{xdigit}`, r`\h`],
      ['[[:xdigit:]]', r`[\h]`],
      ['[0-9A-Fa-f]', r`[\h]`],
    ];
    for (const [input, expected] of cases) {
      expect(optimize(input, {
        flags: 'P',
        override: thisOverride,
      }).pattern).toBe(expected);
    }
  });

  it(r`should not switch to \h when using intersection`, () => {
    const cases = [
      '[0-9&&A-F&&a-f]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it(r`should use \s when possible`, () => {
    const cases = [
      [r`\p{White_Space}`, r`\s`],
      [r`\P{White_Space}`, r`\S`],
      [r`\p{WSpace}`, r`\s`],
      [r`\p{space}`, r`\s`],
      ['[[:space:]]', r`[\s]`],
      ['[[:^space:]]', r`[\S]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should switch only POSIX forms to \s when using flag S or P`, () => {
    const cases = [
      [r`\p{White_Space}`, r`\p{White_Space}`],
      [r`\p{WSpace}`, r`\p{WSpace}`],
      [r`\p{space}`, r`\s`],
      ['[[:space:]]', r`[\s]`],
    ];
    for (const [input, expected] of cases) {
      expect(optimize(input, {
        flags: 'S',
        override: thisOverride,
      }).pattern).toBe(expected);
      expect(optimize(input, {
        flags: 'P',
        override: thisOverride,
      }).pattern).toBe(expected);
    }
  });

  it(r`should use \w when all conditions met`, () => {
    const cases = [
      [r`[\p{L}\p{M}\p{N}\p{Pc}]`, r`[\w]`],
      [r`[^\p{L}\p{M}\p{N}\p{Pc}]`, r`[^\w]`],
      [r`[\p{Pc}\p{Pc}=\p{L}*\p{M}_\p{N}]`, r`[=*_\w]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should not use \w when not all conditions met`, () => {
    const cases = [
      [r`[\p{L}\p{M}\p{N}]`],
      [r`[\p{LC}\p{M}\p{N}\p{Pc}]`],
      [r`[\p{L}\p{M}\p{Nd}\p{Pc}]`, r`[\p{L}\p{M}\d\p{Pc}]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected ?? input);
    }
  });

  it(r`should handle Unicode name variations for \w`, () => {
    const cases = [
      // Full names of supercategories are supported
      [r`[\p{Letter}\p{Mark}\p{Number}\p{Pc}]`, r`[\w]`],
      // Supercategories of required subcategories are supported and not stripped
      [r`[\p{L}\p{M}\p{N}\p{P}]`, r`[\p{P}\w]`],
      [r`[\p{L}\p{M}\p{N}\p{Punctuation}]`, r`[\p{Punctuation}\w]`],
      // Peer categories are not stripped
      [r`[\p{L}\p{M}\p{N}\p{Pd}\p{Pc}]`, r`[\p{Pd}\w]`],
      // Only including a subcategory of a required supercategory is not enough
      [r`[\p{Ll}\p{M}\p{N}\p{Pc}]`, r`[\p{Ll}\p{M}\p{N}\p{Pc}]`],
      // Negated categories don't count
      [r`[\P{L}\p{M}\p{N}\p{Pc}]`, r`[\P{L}\p{M}\p{N}\p{Pc}]`],
      // If a supercategory is stripped, also strip its subcategories
      [r`[\p{L}\p{Ll}\p{M}\p{Mn}\p{Me}\p{N}\p{Pc}]`, r`[\w]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should not switch to \w when using flag W or P`, () => {
    const cases = [
      r`[\p{L}\p{M}\p{N}\p{Pc}]`,
    ];
    for (const input of cases) {
      expect(optimize(input, {
        flags: 'W',
        override: thisOverride,
      }).pattern).toBe(input);
      expect(optimize(input, {
        flags: 'P',
        override: thisOverride,
      }).pattern).toBe(input);
    }
  });

  it(r`should use \O when possible`, () => {
    const cases = [
      [r`\p{Any}`, r`\O`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(r`should not switch to \O when in class`, () => {
    const cases = [
      r`[\p{Any}]`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

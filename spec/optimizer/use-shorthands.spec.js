import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: useShorthands', () => {
  const thisOverride = {
    ...getOptionalOptimizations({disable: true}),
    useShorthands: true,
  };
  function thisOptimization(pattern) {
    return optimize(pattern, {override: thisOverride}).pattern;
  }

  it(`should use \d when possible`, () => {
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

  it(`should switch only POSIX forms with \d when using flag D or P`, () => {
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

  it(`should use \h when possible`, () => {
    const cases = [
      [r`\p{ASCII_Hex_Digit}`, r`\h`],
      [r`\P{ASCII_Hex_Digit}`, r`\H`],
      [r`\p{AHex}`, r`\h`],
      [r`\p{xdigit}`, r`\h`],
      ['[[:xdigit:]]', r`[\h]`],
      ['[[:^xdigit:]]', r`[\H]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(`should switch all forms with \h when using flag P`, () => {
    // `\h` only has an ASCII form
    const cases = [
      [r`\p{ASCII_Hex_Digit}`, r`\h`],
      [r`\p{AHex}`, r`\h`],
      [r`\p{xdigit}`, r`\h`],
      ['[[:xdigit:]]', r`[\h]`],
    ];
    for (const [input, expected] of cases) {
      expect(optimize(input, {
        flags: 'P',
        override: thisOverride,
      }).pattern).toBe(expected);
    }
  });

  it(`should use \s when possible`, () => {
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

  it(`should switch only POSIX forms with \s when using flag S or P`, () => {
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

  it(`should use \w when possible`, () => {
    const cases = [
      [r`\p{word}`, r`\w`],
      [r`\P{word}`, r`\W`],
      ['[[:word:]]', r`[\w]`],
      ['[[:^word:]]', r`[\W]`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it(`should switch POSIX forms with \w when using flag W or P`, () => {
    const cases = [
      [r`\p{word}`, r`\w`],
      ['[[:word:]]', r`[\w]`],
    ];
    for (const [input, expected] of cases) {
      expect(optimize(input, {
        flags: 'W',
        override: thisOverride,
      }).pattern).toBe(expected);
      expect(optimize(input, {
        flags: 'P',
        override: thisOverride,
      }).pattern).toBe(expected);
    }
  });
});

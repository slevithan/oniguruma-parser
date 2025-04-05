import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: useUnicodeAliases', () => {
  const thisOptimization = getNarrowOptimizer('useUnicodeAliases');

  it('should replace Unicode property names with aliases when available', () => {
    const cases = [
      [r`\p{Letter}`, r`\p{L}`],
      [r`\p{ASCII_Hex_Digit}`, r`\p{AHex}`],
      // Although `punct` is also a POSIX class name, it's treated as a Unicode alias (for general
      // category `Punctuation`) if it's used with Unicode property syntax
      [r`\p{punct}`, r`\p{P}`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
      expect(thisOptimization(`[${input}]`)).toBe(`[${expected}]`);
    }
  });

  it('should not apply to POSIX classes using Unicode property syntax', () => {
    const cases = [
      r`\p{cntrl}`, // Not `\p{Cc}`
      r`\p{digit}`, // Not `\p{Nd}`
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

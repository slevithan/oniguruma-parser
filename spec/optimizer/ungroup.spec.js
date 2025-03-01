import {optimize} from '../../dist/optimizer/optimize.js';

describe('optimizer: ungroup', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {allow: ['ungroup']}).pattern;
  }

  it('should remove unnecessary nested groups', () => {
    const cases = [
      ['(?:(?:a))', '(?:a)'],
      ['(?:(?:(?:a)))', '(?:a)'],
      ['(?:(?>a))', '(?>a)'],
      ['(?>(?:a))', '(?>a)'],
      ['(?>(?>a))', '(?>a)'],
      ['(?:(?i:a))', '(?i:a)'],
      ['(?i:(?:a))', '(?i:a)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not remove necessary nested groups', () => {
    const cases = [
      ['(?i:(?>a))', '(?i:(?>a))'],
      ['(?>(?i:a))', '(?>(?i:a))'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

import {optimize} from '../../dist/optimizer/optimize.js';

describe('optimizer: ungroup', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {allow: ['ungroup']}).pattern;
  }

  it('should remove unnecessary groups', () => {
    const cases = [
      ['(?:a)', 'a'],
      ['(?:(?:(?:a)))', 'a'],
      ['(?>a)', 'a'],
      ['(?x:a)', 'a'],
      ['(?-x:a)', 'a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not remove necessary groups', () => {
    const cases = [
      '(a)',
      '(?:a|b)',
      '(?:a)*',
      '(?>a*)',
      '(?>(?=a*))',
      '(?>(?~a))',
      '(?i:a)',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

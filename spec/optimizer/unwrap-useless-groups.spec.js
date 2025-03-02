import {optimize} from '../../dist/optimizer/optimize.js';

describe('optimizer: unwrapUselessGroups', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {allow: ['unwrapUselessGroups']}).pattern;
  }

  it('should unwrap unnecessary groups', () => {
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

  it('should not unwrap necessary groups', () => {
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

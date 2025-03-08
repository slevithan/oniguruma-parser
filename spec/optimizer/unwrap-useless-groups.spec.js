import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: unwrapUselessGroups', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        unwrapUselessGroups: true,
      },
    }).pattern;
  }

  it('should unwrap unnecessary groups', () => {
    const cases = [
      ['(?:a)', 'a'],
      ['(?:(?:(?:a)))', 'a'],
      ['(?>a)', 'a'],
      ['(?:a(?:b))', 'ab'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not unwrap necessary groups', () => {
    const cases = [
      '(a)',
      '(?:a|b)',
      '(?:ab)*',
      '(?:^)*',
      '(?:(?=a))*',
      '(?>a*)',
      '(?>(?=a*))',
      '(?>(?~a))',
      '(?>(?~a))*',
      '(?i:a)',
      '(?i:a)*',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should unwrap and retain the following quantifier if the group contains a single, quantifiable node', () => {
    const cases = [
      ['(?:a)*', 'a*'],
      [r`(?:\s)*`, r`\s*`],
      [r`(?:\R)*`, r`\R*`],
      ['(?:[ab])*', '[ab]*'],
      ['(?>a)*', 'a*'],
      ['(?:(?>a))*', 'a*'],
      ['(?:(?<name>a))*', '(?<name>a)*'],
      ['(?:(?~a))*', '(?~a)*'],
      ['(?:a*)*', 'a**'],
      ['(?:(?:(?:a)))*', 'a*'],
      ['(?:(?:(?:a*)*)*)*', 'a****'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

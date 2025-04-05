import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';
import {describe, expect, it} from 'vitest';
import {getNarrowOptimizer} from '../spec-utils.js';

describe('Optimizer: unwrapUselessGroups', () => {
  const thisOptimization = getNarrowOptimizer('unwrapUselessGroups');

  it('should unwrap unnecessary groups with a single alternative', () => {
    const cases = [
      ['(?:a)', 'a'],
      ['(?:(?:(?:a)))', 'a'],
      ['(?:a(?:b))', 'ab'],
      ['(?:(?:ab)(?:c))', 'abc'],
      ['(?>a)', 'a'],
      ['(?>[ab])', '[ab]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should unwrap unnecessary noncapturing groups with multiple alternatives', () => {
    const cases = [
      ['(?:a|b)', 'a|b'],
      ['(?:(?:a|b))', 'a|b'],
      ['((?:a|b))', '(a|b)'],
      ['(?<n>(?:a|b))', '(?<n>a|b)'],
      ['(?>(?:a|b))', '(?>a|b)'],
      ['(?i:(?:a|b))', '(?i:a|b)'],
      ['(?~(?:a|b))', '(?~a|b)'],
      ['(?=(?:a|b))', '(?=a|b)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should unwrap unnecessary quantified groups with a single quantifiable node', () => {
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
      ['(?:a+)?', 'a+{0,1}'],
      ['(?:a+)?+', 'a+{1,0}'],
      ['(?:a+)+', 'a+{1,}'],
      ['(?:a+)++', 'a{1,}++'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not unwrap necessary groups', () => {
    const cases = [
      '(?:a|b)c',
      '(?:ab)*',
      '(?:^)*',
      '(?:(?=a))*',
      '(?>a*)',
      '(?>(?=a*))',
      '(?>(?~a))',
      '(?>(?~a))*',
      '(?i:a)',
      '(?i:a)*',
      '(a)',
      '((a))',
      '((?>a|b))',
      '((?i:a|b))',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

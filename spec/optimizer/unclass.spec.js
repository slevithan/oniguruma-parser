import {optimize} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('optimizer: unwrapClasses', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {allow: ['unwrapClasses']}).pattern;
  }

  it('should unwrap unnecessary character classes', () => {
    const cases = [
      ['[a]', 'a'],
      ['[a]*', 'a*'],
      [r`[\u0061]`, 'a'],
      [r`[\s]`, r`\s`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not unwrap nested character classes', () => {
    const cases = [
      '[[a]]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not unwrap necessary character classes', () => {
    const cases = [
      '[ab]',
      '[a-z]',
      '[^a]',
      '[&&]',
      '[a&&]',
      '[a&&a]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
    expect(() => thisOptimization('[]')).toThrow();
  });
});

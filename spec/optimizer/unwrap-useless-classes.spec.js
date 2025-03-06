import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: unwrapUselessClasses', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        unwrapUselessClasses: true,
      },
    }).pattern;
  }

  it('should unwrap unnecessary classes', () => {
    const cases = [
      ['[a]', 'a'],
      ['[a]*', 'a*'],
      [r`[\u0061]`, 'a'],
      [r`[\s]`, r`\s`],
      ['[.]', r`\.`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should flip negation of sets when unwrapping negated classes', () => {
    const cases = [
      [r`[^\d]`, r`\D`],
      [r`[^\D]`, r`\d`],
      [r`[^\h]`, r`\H`],
      [r`[^\H]`, r`\h`],
      [r`[^\s]`, r`\S`],
      [r`[^\S]`, r`\s`],
      [r`[^\w]`, r`\W`],
      [r`[^\W]`, r`\w`],
      [r`[^\p{L}]`, r`\P{L}`],
      [r`[^\P{L}]`, r`\p{L}`],
      [r`[^[:word:]]`, r`\P{word}`],
      [r`[^[:^word:]]`, r`\p{word}`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not unwrap nested classes', () => {
    const cases = [
      '[[a]]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not unwrap necessary classes', () => {
    const cases = [
      '[^a]',
      '[ab]',
      '[a-z]',
      '[a&&a]',
      '[&&]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
    expect(() => thisOptimization('[]')).toThrow();
  });
});

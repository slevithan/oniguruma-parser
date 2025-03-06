import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: unnestUselessClasses', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        unnestUselessClasses: true,
      },
    }).pattern;
  }

  it('should unnest unnecessary character classes', () => {
    const cases = [
      ['[[a]]', '[a]'],
      ['[^[a]]', '[^a]'],
      ['[[[a]]]', '[a]'],
      ['[[a][b]]', '[ab]'],
      ['[a[b]]', '[ab]'],
      ['[[a]b]', '[ab]'],
      ['[a[bc]d]', '[abcd]'],
      [r`[[^\w]]`, r`[\W]`],
      ['[a[[bc]d]]', '[abcd]'],
      ['[[a]&&[b-c]]', '[a&&b-c]'],
      // [TODO] Enable after supporting `format: 'implicit'` in the generator
      // ['[[ab]&&[cd-e]]', '[ab&&cd-e]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not unnest necessary character classes', () => {
    const cases = [
      '[[^a]]',
      r`[[^\w!]]`,
      '[[&&]]',
      '[[a&&b]]',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
    expect(() => thisOptimization('[]')).toThrow();
  });
});

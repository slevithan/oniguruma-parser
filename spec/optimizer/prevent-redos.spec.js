import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: preventReDoS', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        preventReDoS: true,
      },
    }).pattern;
  }

  it('should avoid ReDoS for quantified group with qualifying nested quantifier', () => {
    const cases = [
      ['(?:[^!]*)*', '(?:[^!]?)*'],
      [r`'([^']+|\\')*'`, r`'([^']|\\')*'`],
      ['!(?:[^!]*)*!', '!(?:[^!]?)*!'],
      ['!(?:[^!]+)*!', '!(?:[^!])*!'],
      [r`/\*(?:[^*]+|\*+(?!/))*\*/`, r`/\*(?:[^*]|\*+(?!/))*\*/`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not apply to non-qualifying cases', () => {
    const cases = [
      // Triggers ReDoS; can't optimize without change in matches using current solution
      r`/\*(?:\*+(?!/)|[^*]+)*\*/`,
      // Doesn't trigger ReDoS
      '!(?:[^!]+)?!',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

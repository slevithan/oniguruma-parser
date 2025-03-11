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

  it('should avoid ReDoS for quantified groups with qualifying nested quantifiers', () => {
    const cases = [
      ['(?:.*)+!', '(?:.?)+!'],
      ['(?:.*)*!', '(?:.?)*!'],
      ['(?:(?:..){0,10})*!', '(?:(?:..)?)*!'],
      ['(?:.+)*!', '(?:.)*!'],
      ['(?:(.){1,10})*!', '(?:(.))*!'],
      [r`'(?:[^'\\]+|\\.)*'`, r`'(?:[^'\\]|\\.)*'`],
      [r`/\*(?:[^*]+|\*+(?!/))*\*/`, r`/\*(?:[^*]|\*+(?!/))*\*/`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not apply to non-qualifying cases', () => {
    const cases = [
      // Triggers ReDoS, but optimization could change matches
      '(?:.{2,10})*!',
      '(?:.*){2,10}!',
      '(?:.|.+)*!',
      '(?:..+|.)*!',
      // Triggers ReDoS, but optimization could change submatches
      '(.+)*!',
      // Doesn't trigger ReDoS
      '(?:.+)?!',
      '(?:.?)+!',
      '(?>.+)*!',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

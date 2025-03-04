import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: extractPrefix', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        extractPrefix: true,
      },
    }).pattern;
  }

  it('should extract a prefix found in all alternatives', () => {
    const cases = [
      ['^a|^b', '^(?:a|b)'],
      [r`\da|\db|\dc`, r`\d(?:a|b|c)`],
      ['^aa|^abb|^ac', '^a(?:a|bb|c)'],
      ['^aa|^a|^ac', '^a(?:a||c)'],
      ['aa|aa', 'aa'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
      expect(thisOptimization(`(${input})`)).toBe(`(${expected})`);
    }
  });

  it('should not apply when a shared prefix is not found', () => {
    const cases = [
      'a',
      'a|b',
      'aa|ba',
      'aa|ab|',
      'aa|ab|ca',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not consider non-Assertion/Character/CharacterSet nodes for the prefix', () => {
    const cases = [
      ['(a)a|(a)b', '(a)a|(a)b'],
      ['[a]a|[a]b', '[a]a|[a]b'],
      [r`\Ka|\Kb`, r`\Ka|\Kb`],
      ['^[a]a|^[a]a', '^(?:[a]a|[a]a)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

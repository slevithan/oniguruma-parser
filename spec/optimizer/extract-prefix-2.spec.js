import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: extractPrefix2', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        extractPrefix2: true,
      },
    }).pattern;
  }

  it('should extract alternating prefixes if patterns are repeated for each prefix', () => {
    const cases = [
      ['^a|!a|^b|!b', '(?:^|!)(?:a|b)'],
      [r`\da|..a|\d|..|\dcc|..cc`, r`(?:\d|..)(?:a||cc)`],
      ['^a|!a|^a|!a|^b|!b', '(?:^|!)(?:a|a|b)'],
      ['^a|!a|^a|!a', '^a|!a'], // No suffix
      ['a|b|a|b', 'a|b'], // No suffix
      ['^a|!a', '^a|!a'], // No suffix, but also the prefix set is not repeated
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
      expect(thisOptimization(`(${input})`)).toBe(`(${expected})`);
    }
  });

  it('should not apply when an alternating prefix is not found for all alternatives', () => {
    const cases = [
      'a',
      'a|b',
      '^a|!a|^b|!b|^c',
      '^a|!a|^b|!b|c',
      '^a|!a||^b|!b',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not apply when the alternating prefix has more than two items', () => {
    const cases = [
      '^a|!a|#a|^b|!b|#b',
      'a|b|c|a|b|c',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Just documenting current behavior
  it('should not consider non-simple nodes for the prefix', () => {
    const cases = [
      '(^)a|(!)a|(^)b|(!)b',
      '[#]a|[!]a|[#]b|[!]b',
      r`\Ka|!a|\Kb|!b`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Just documenting current behavior
  it('should not consider non-simple nodes for the suffix', () => {
    const cases = [
      '^(a)|!(a)|^(b)|!(b)',
      '^[a]|![a]|^[b]|![b]',
      r`^\K|!\K|^b|!b`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

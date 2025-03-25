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
      ['^a|^ab|^ac', '^a(?:|b|c)'],
      ['^aa|^a|^ac', '^a(?:a||c)'],
      ['aa|aa', 'aa'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should apply within groups', () => {
    const cases = [
      ['(aa|ab)', '(a(?:a|b))'],
      ['(?<n>aa|ab)', '(?<n>a(?:a|b))'],
      ['(?:aa|ab)', '(?:a(?:a|b))'],
      ['(?i:aa|ab)', '(?i:a(?:a|b))'],
      ['(?>aa|ab)', '(?>a(?:a|b))'],
      ['(?=aa|ab)', '(?=a(?:a|b))'],
      ['(?~aa|ab)', '(?~a(?:a|b))'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
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

  // Just documenting current behavior
  it('should not consider non-simple nodes for the prefix', () => {
    const cases = [
      '(a)a|(a)b',
      '[a]a|[a]b',
      r`\Ka|\Kb`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
    const changes = [
      ['^[a]a|^[a]a', '^(?:[a]a|[a]a)'],
    ];
    for (const [input, expected] of changes) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

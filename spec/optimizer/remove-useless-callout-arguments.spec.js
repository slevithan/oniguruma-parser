import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';

describe('Optimizer: removeUselessCalloutArguments', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        removeUselessCalloutArguments: true,
      },
    }).pattern;
  }

  it('should remove useless brackets {}', () => {
    const cases = [
      ['(*FAIL{})', '(*FAIL)'],
      ['(*MISMATCH[T]{})', '(*MISMATCH[T])'],
      ['(*SKIP{})', '(*SKIP)'],
      ['(*ERROR[abc]{})', '(*ERROR[abc])'],
      ['(*MAX{1})', '(*MAX{1})'],
      ['(*COUNT[Tag]{2})', '(*COUNT[Tag]{2})'],
      ['(*TOTAL_COUNT{3})', '(*TOTAL_COUNT{3})'],
      ['(*CMP{T,==,5})', '(*CMP{T,==,5})'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should remove useless commas', () => {
    const cases = [
      ['(*FAIL{})', '(*FAIL)'],
      ['(*MISMATCH[T]{,})', '(*MISMATCH[T])'],
      ['(*SKIP{,,})', '(*SKIP)'],
      ['(*ERROR{,,-1,})', '(*ERROR{-1})'],
      ['(*MAX[Tag]{1,,})', '(*MAX[Tag]{1})'],
      ['(*COUNT{,,2})', '(*COUNT{2})'],
      ['(*TOTAL_COUNT{,,3,,})', '(*TOTAL_COUNT{3})'],
      ['(*CMP{,T,,==,,,5,,,,})', '(*CMP{T,==,5})'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should optimize numbers', () => {
    const cases = [
      ['(*ERROR{-1})', '(*ERROR{-1})'],
      ['(*MAX{+1})', '(*MAX{1})'],
      ['(*COUNT{+00002})', '(*COUNT{2})'],
      ['(*TOTAL_COUNT{-3})', '(*TOTAL_COUNT{-3})'],
      ['(*CMP{T9000,>=,-05})', '(*CMP{T9000,>=,-5})'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

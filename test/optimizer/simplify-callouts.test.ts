import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: simplifyCallouts', () => {
  const thisOptimization = getNarrowOptimizer('simplifyCallouts');

  it('should change (*FAIL) to (?!)', () => {
    expect(thisOptimization('(*FAIL)')).toBe('(?!)');
  });

  it('should remove useless argument braces', () => {
    const cases = [
      ['(*FAIL{})', '(?!)'],
      ['(*MISMATCH[T]{})', '(*MISMATCH[T])'],
      ['(*SKIP{})', '(*SKIP)'],
      ['(*ERROR[abc]{})', '(*ERROR[abc])'],
      ['(*MAX{1})', '(*MAX{1})'],
      ['(*COUNT[Tag]{X})', '(*COUNT[Tag]{X})'],
      ['(*TOTAL_COUNT{<})', '(*TOTAL_COUNT{<})'],
      ['(*CMP{T,==,5})', '(*CMP{T,==,5})'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should remove useless argument commas', () => {
    const cases = [
      ['(*FAIL{,})', '(?!)'],
      ['(*MISMATCH[T]{,})', '(*MISMATCH[T])'],
      ['(*SKIP{,,})', '(*SKIP)'],
      ['(*ERROR{,,-1,})', '(*ERROR{-1})'],
      ['(*MAX[Tag]{1,,})', '(*MAX[Tag]{1})'],
      ['(*COUNT{,,>})', '(*COUNT{>})'],
      ['(*TOTAL_COUNT{,,X,,})', '(*TOTAL_COUNT{X})'],
      ['(*CMP{,T,,==,,,5,,,,})', '(*CMP{T,==,5})'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should simplify numbers', () => {
    const cases = [
      ['(*ERROR{-1})', '(*ERROR{-1})'],
      ['(*ERROR{-0003})', '(*ERROR{-3})'],
      ['(*MAX{+2})', '(*MAX{2})'],
      ['(*MAX{+00783})', '(*MAX{783})'],
      ['(*CMP{T9000,>=,-05})', '(*CMP{T9000,>=,-5})'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

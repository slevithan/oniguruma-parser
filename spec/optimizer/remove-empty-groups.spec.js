import {optimize, getAllOptimizations} from '../../dist/optimizer/optimize.js';

describe('Optimizer: removeEmptyGroups', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getAllOptimizations({disable: true}),
        removeEmptyGroups: true,
      },
    }).pattern;
  }

  it('should remove empty noncapturing, atomic, and flag groups', () => {
    const cases = [
      ['(?:)', ''],
      ['(?:)a', 'a'],
      ['a|(?:)', 'a|'],
      ['(?>)a', 'a'],
      ['(?i:)a', 'a'],
      ['(?i-m:)a', 'a'],
      ['(?:)(?:)a', 'a'],
      ['(?:(?:))a', 'a'],
      ['(?:(?>(?i:)))a', 'a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should remove quantified empty noncapturing, atomic, and flag groups', () => {
    const cases = [
      ['(?:)+a', 'a'],
      ['(?:)+?*+a', 'a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should remove empty noncapturing, atomic, and flag groups with only empty alternatives', () => {
    const cases = [
      ['(?:|)a', 'a'],
      ['(?ix: | | )a', 'a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not remove non-empty groups', () => {
    const cases = [
      '(?:a)',
      '(?:^)',
      '(?:| )',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

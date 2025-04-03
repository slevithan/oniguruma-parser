import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';

describe('Optimizer: removeEmptyGroups', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        removeEmptyGroups: true,
      },
    }).pattern;
  }

  it('should remove empty qualifying groups', () => {
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
      ['(?=)a', 'a'],
      ['(?<=)a', 'a'],
      ['(?~)a', 'a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should remove empty quantified, qualifying groups', () => {
    const cases = [
      ['(?:)+a', 'a'],
      ['(?:)+?*+a', 'a'],
      ['(?>)?a', 'a'],
      ['(?~)?a', 'a'],
      ['(?:(?=))?a', 'a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should remove qualifying groups with multiple alternatives that are all empty', () => {
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
      '(?=a)',
      '(?~a)',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not remove empty, non-qualifying groups', () => {
    const cases = [
      '|',
      '()a',
      '(|)a',
      '(?!)a',
      '(?<!)a',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

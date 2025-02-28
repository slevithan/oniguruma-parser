import {optimize} from '../../dist/optimizer/index.js';

describe('optimizer: removeEmptyGroups', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {allow: ['removeEmptyGroups']}).pattern;
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

  it('should not remove non-empty groups', () => {
    const cases = [
      ['(?:a)', '(?:a)'],
      ['(?:a(?:))', '(?:a)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });
});

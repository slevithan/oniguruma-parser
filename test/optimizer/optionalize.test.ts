import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: optionalize', () => {
  const thisOptimization = getNarrowOptimizer('optionalize');

  it('should merge adjacent alternatives where only the last node is different', () => {
    const cases = [
      ['a|', 'a?'],
      ['a||x', 'a?|x'],
      ['|a', 'a??'],
      ['aa|a', 'aa?'],
      ['aa|a|x', 'aa?|x'],
      ['a|aa', 'aa??'],
      ['a|aa|x', 'aa??|x'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not apply if the left alt for the comparison is empty and there are more than two alternatives', () => {
    expect(thisOptimization('|a|x')).toBe('|a|x');
    const cases = [
      '|a|x',
      'aa||a|x',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should merge adjacent, identical alternatives', () => {
    const cases = [
      ['|', ''],
      ['a|a', 'a'],
      ['a|a|x', 'a|x'],
      ['a|a|a|x', 'a|x'],
      ['a|a|x|a', 'a|x|a'],
      ['a|a|x|a|a', 'a|x|a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should apply within groups', () => {
    const cases = [
      ['(..|.)', '(..?)'],
      ['(?:..|.)', '(?:..?)'],
      ['(?>..|.)', '(?>..?)'],
      ['(?<n>..|.)', '(?<n>..?)'],
      ['(?~..|.)', '(?~..?)'],
      ['(?=..|.)', '(?=..?)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not apply if less than two alternatives', () => {
    const cases = [
      '',
      'a',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not apply if more than the last node is different', () => {
    const cases = [
      'aa|',
      '|aa',
      'aa||aa',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not apply if the last node is a quantifier', () => {
    const cases = [
      'a?|a',
      'a|a?',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

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

  it('should merge adjacent alternatives where only the last node is different and it uses a supported quantifier', () => {
    const cases = [
      ['tests?|test|x', 'tests?|x'],
      ['tests*|test|x', 'tests*|x'],
      ['tests+|test|x', 'tests*|x'], // `+` to `*`
      ['tests??|test|x', 'tests??|x'],
      ['tests*?|test|x', 'tests*?|x'],
      ['tests?+|test|x', 'tests?+|x'],
      ['test|tests?|x', 'tests??|x'], // `?` to `??`
      ['test|tests??|x', 'tests??|x'],
      ['test|tests*?|x', 'tests*?|x'],
      ['test|tests+?|x', 'tests*?|x'], // `+?` to `*?`
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not apply where only the last node is different and it uses an unsupported quantifier', () => {
    // Collapsing these would change the meaning, at least if we don't want to use a quantifier chain
    const cases = [
      'tests{2,}|test|x',
      'tests+?|test|x',
      'test|tests*|x',
      'test|tests+|x',
      'test|tests?+|x',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  // Just documenting current behavior; could support some cases
  it('should not apply if alts are the same except one of them quantifies the last node', () => {
    const cases = [
      'a?|a',
      'a|a?',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

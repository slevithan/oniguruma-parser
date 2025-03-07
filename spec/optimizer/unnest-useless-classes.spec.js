import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: unnestUselessClasses', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        unnestUselessClasses: true,
      },
    }).pattern;
  }

  it('should unnest unnecessary classes', () => {
    const cases = [
      [ '[[a]]',   '[a]'],
      [r`[[\w]]`, r`[\w]`],
      [ '[^[a]]',   '[^a]'],
      [r`[^[\w]]`, r`[^\w]`],
      [ '[[^a]]',   '[^a]'],
      [r`[[^\w]]`, r`[^\w]`],
      [ '[^[^a]]',   '[a]'],
      [r`[^[^\w]]`, r`[\w]`],
      [ '[[[a]]]',   '[a]'],
      [r`[[[\w]]]`, r`[\w]`],
      [ '[^[^[a]]]',   '[a]'],
      [r`[^[^[\w]]]`, r`[\w]`],
      [ '[^[^[^a]]]',   '[^a]'],
      [r`[^[^[^\w]]]`, r`[^\w]`],
      [ '[[ab]]',   '[ab]'],
      [r`[[\wb]]`, r`[\wb]`],
      [ '[[^ab]]',   '[^ab]'],
      [r`[[^\wb]]`, r`[^\wb]`],
      [ '[^[ab]]',   '[^ab]'],
      [r`[^[\wb]]`, r`[^\wb]`],
      [ '[^[^ab]]',   '[ab]'],
      [r`[^[^\wb]]`, r`[\wb]`],
      [ '[[a][b]]',   '[ab]'],
      [r`[[a][\w]]`, r`[a\w]`],
      [ '[a[b]]',   '[ab]'],
      [r`[a[\w]]`, r`[a\w]`],
      [ '[a[ab]]',   '[aab]'],
      [r`[a[\wb]]`, r`[a\wb]`],
      [ '[[a]b]', '[ab]'],
      [ '[a[bc]d]', '[abcd]'],
      [ '[a[[bc]d]]', '[abcd]'],
      [ '[[a]&&[b-c]]', '[a&&b-c]'],
      // [TODO] Enable after supporting `format: 'implicit'` in the generator
      // ['[[ab]&&[cd-e]]', '[ab&&cd-e]'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not unnest necessary classes', () => {
    const cases = [
      '[a[^b]]',
      r`[a[^\w]]`, // `\w` can be inverted; handled by `unwrapNegationWrappers`
      '[a[^ab]]',
      r`[a[^\wb]]`,
      '[[&&]]',
      '[[a&&b]]',
      '[[:alpha:]]', // POSIX class is a character set; not a nested class
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not unwrap outermost classes', () => {
    const cases = [
      '[a]',
      r`[\w]`,
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
    // Unsupported Onig syntax; classes can only be empty if they're implicit in an intersection;
    // ex: on the left side of `[&&a]`
    expect(() => thisOptimization('[[]]')).toThrow();
  });
});

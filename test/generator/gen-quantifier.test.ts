import {gen} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

// [From src/generator/generate.ts > generator.Quantifier:]
// Rendering Onig quantifiers is wildly, unnecessarily complex compared to other regex flavors
// because of the combination of a few features unique to Onig:
// - You can create quantifier chains (i.e., quantify a quantifier).
// - An implicit zero min is allowed for interval quantifiers (ex: `{,2}`).
// - Interval quantifiers can't use `+` to make them possessive (it creates a quantifier
//   chain), even though quantifiers `?` `*` `+` can.
// - A reversed range in a quantifier makes it possessive (ex: `{2,1}`).
//   - `{,n}` is always greedy with an implicit zero min, and can't represent a possessive
//     range from n to infinity.

describe('Generator: Quantifier', () => {
  it('should support symbol quantifiers', () => {
    const cases = [
      // `?`
      ['.?', '.?'],
      ['.??', '.??'],
      ['.?+', '.?+'],
      // `*`
      ['.*', '.*'],
      ['.*?', '.*?'],
      ['.*+', '.*+'],
      // `+`
      ['.+', '.+'],
      ['.+?', '.+?'],
      ['.++', '.++'],
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected);
    }
  });

  it('should support interval quantifiers', () => {
    // Interval quantifiers allow implicit zero min `{,n}` and use reversed ranges like `{2,1}`
    // as their possessive representation. This means not all interval quantifier min/max values
    // are capable of being represented possessively. Unlike most other regex flavors, in Onig a
    // `+` after an interval quantifier creates a quantifier chain rather than making the
    // quantifier possessive, e.g. `.{2,1}+` is equivalent to `.{2,1}{1,}` (or `(?:.{1,2}+)+` in
    // other regex flavors). A quantifier also can't be both possessive and lazy, so e.g. `.{2,1}?`
    // is equivalent to the quantifier chain `.{2,1}{0,1}` (or `(?:.{1,2}+)?` in other regex
    // flavors)
    const cases = [
      // Fixed
      ['.{0}'],
      ['.{0}?'],
      ['.{1}'],
      ['.{1}?'],
      ['.{2}'],
      ['.{2}?'],
      // Fixed range
      ['.{0,0}', '.{0}'],
      ['.{0,0}?', '.{0}?'],
      ['.{1,1}', '.{1}'],
      ['.{1,1}?', '.{1}?'],
      ['.{2,2}', '.{2}'],
      ['.{2,2}?', '.{2}?'],
      // Range
      ['.{0,1}', '.?'],
      ['.{0,1}?', '.??'],
      ['.{1,2}'],
      ['.{1,2}?'],
      // Implicit zero min
      ['.{,0}', '.{0}'],
      ['.{,0}?', '.{0}?'],
      ['.{,1}', '.?'],
      ['.{,1}?', '.??'],
      ['.{,2}', '.{0,2}'],
      ['.{,2}?', '.{0,2}?'],
      // Unbounded
      ['.{0,}', '.*'],
      ['.{0,}?', '.*?'],
      ['.{1,}', '.+'],
      ['.{1,}?', '.+?'],
      ['.{2,}'],
      ['.{2,}?'],
      // Reversed (possessive)
      ['.{1,0}', '.?+'],
      ['.{2,0}'],
      ['.{2,1}'],
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected ?? input);
    }
  });

  it('should support chained quantifiers that all use symbol bases', () => {
    // All of these use only two quantifiers in a chain, but the same rules apply to longer chains
    const cases = [
      // `?` base followed by `?` base
      '.???',
      '.????',
      '.???+',
      '.?+?',
      '.?+??',
      '.?+?+',
      // `?` base followed by `*` base
      '.?*',
      '.?*?',
      '.?*+',
      '.??*',
      '.??*?',
      '.??*+',
      '.?+*',
      '.?+*?',
      '.?+*+',
      // `?` base followed by `+` base
      '.??+',
      '.??+?',
      '.??++',
      '.?++',
      '.?++?',
      '.?+++',
      // `*` base followed by `?` base
      '.*??',
      '.*???',
      '.*??+',
      '.*+?',
      '.*+??',
      '.*+?+',
      // `*` base followed by `*` base
      '.**',
      '.**?',
      '.**+',
      '.*?*',
      '.*?*?',
      '.*?*+',
      '.*+*',
      '.*+*?',
      '.*+*+',
      // `*` base followed by `+` base
      '.*?+',
      '.*?+?',
      '.*?++',
      '.*++',
      '.*++?',
      '.*+++',
      // `+` base followed by `?` base
      '.+??',
      '.+???',
      '.+??+',
      '.++?',
      '.++??',
      '.++?+',
      // `+` base followed by `*` base
      '.+*',
      '.+*?',
      '.+*+',
      '.+?*',
      '.+?*?',
      '.+?*+',
      '.++*',
      '.++*?',
      '.++*+',
      // `+` base followed by `+` base
      '.+?+',
      '.+?+?',
      '.+?++',
      '.+++',
      '.+++?',
      '.++++',
    ];
    for (const input of cases) {
      expect(gen(input)).toBe(input);
    }
  });

  it('should support chained quantifiers with an initial interval quantifier', () => {
    // All of these use only two quantifiers in a chain, but the same rules apply to longer chains
    const cases = [
      // Fixed base
      ['.{2}*'],
      ['.{2}+'],
      ['.{2}{2}'],
      ['.{2}{2,2}', '.{2}{2}'],
      ['.{2}{2,3}'],
      ['.{2}{,2}', '.{2}{0,2}'],
      ['.{2}{2,}'],
      ['.{2}{2,1}'],
      // Lazy fixed base
      ['.{2}??'],
      ['.{2}?*'],
      ['.{2}?+'],
      ['.{2}?{2}'],
      ['.{2}?{2,2}', '.{2}?{2}'],
      ['.{2}?{2,3}'],
      ['.{2}?{,2}', '.{2}?{0,2}'],
      ['.{2}?{2,}'],
      ['.{2}?{2,1}'],
      // Fixed range base
      ['.{2,2}*', '.{2}*'],
      ['.{2,2}+', '.{2}+'],
      ['.{2,2}{2}', '.{2}{2}'],
      ['.{2,2}{2,2}', '.{2}{2}'],
      ['.{2,2}{2,3}', '.{2}{2,3}'],
      ['.{2,2}{,2}', '.{2}{0,2}'],
      ['.{2,2}{2,}', '.{2}{2,}'],
      ['.{2,2}{2,1}', '.{2}{2,1}'],
      // Range base
      ['.{2,3}*'],
      ['.{2,3}+'],
      ['.{2,3}{2}'],
      ['.{2,3}{2,2}', '.{2,3}{2}'],
      ['.{2,3}{2,3}'],
      ['.{2,3}{,2}', '.{2,3}{0,2}'],
      ['.{2,3}{2,}'],
      ['.{2,3}{2,1}'],
      // Implicit zero min base
      ['.{,2}*', '.{0,2}*'],
      ['.{,2}+', '.{0,2}+'],
      ['.{,2}{2}', '.{0,2}{2}'],
      ['.{,2}{2,2}', '.{0,2}{2}'],
      ['.{,2}{2,3}', '.{0,2}{2,3}'],
      ['.{,2}{,2}', '.{0,2}{0,2}'],
      ['.{,2}{2,}', '.{0,2}{2,}'],
      ['.{,2}{2,1}', '.{0,2}{2,1}'],
      // Unbounded base
      ['.{2,}*'],
      ['.{2,}+'],
      ['.{2,}{2}'],
      ['.{2,}{2,2}', '.{2,}{2}'],
      ['.{2,}{2,3}'],
      ['.{2,}{,2}', '.{2,}{0,2}'],
      ['.{2,}{2,}'],
      ['.{2,}{2,1}'],
      // Reversed (possessive) base
      ['.{2,1}?'], // Special case: `?` isn't a lazy-suffix
      ['.{2,1}*'],
      ['.{2,1}+'],
      ['.{2,1}{2}'],
      ['.{2,1}{2,2}', '.{2,1}{2}'],
      ['.{2,1}{2,3}'],
      ['.{2,1}{,2}', '.{2,1}{0,2}'],
      ['.{2,1}{2,}'],
      ['.{2,1}{2,1}'],
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected ?? input);
    }
  });

  it('should support chained quantifiers with a chained `++`', () => {
    // An initial `{0,1}`, `{0,}`, or `{1,}` can't be represented as `?`, `*`, or `+` since there's
    // no interval-based way to represent possessive `++`, and a following `+` would make `?`, `*`,
    // or `+` possessive
    const cases = [
    // Initial `?` or equivalent
      // Greedy
      ['.{0,1}++'],
      // Lazy
      ['.??++'],
      ['.{0,1}?++', '.??++'],
      // Possessive
      ['.?+++'],
      ['.{1,0}++', '.?+++'],
    // Initial `*` or equivalent
      // Greedy
      ['.*++'],
      ['.{0,}++'],
      // Lazy
      ['.*?++', '.*?++'],
      ['.{0,}?++', '.*?++'],
      // Possessive
      ['.*+++'],
    // Initial `+` or equivalent
      // Greedy
      ['.{1,}++'],
      // Lazy
      ['.+?++'],
      ['.{1,}?++', '.+?++'],
      // Possessive
      ['.++++'],
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected ?? input);
    }
  });
});

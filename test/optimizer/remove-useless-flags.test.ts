import {getOptionalOptimizations, optimize} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';
import {getNarrowOptimizer} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer: removeUselessFlags', () => {
  const thisOverride = {
    ...getOptionalOptimizations({disable: true}),
    removeUselessFlags: true,
  };
  const thisOptimization = getNarrowOptimizer('removeUselessFlags');

  it('should remove useless flags from groups', () => {
    const cases = [
      ['(?x:a)', '(?:a)'],
      ['(?-x:a)', '(?:a)'],
      ['(?x-x:a)', '(?:a)'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not remove necessary flags from groups', () => {
    const cases = [
      '(?i:a)',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should remove useless flags from flag directives', () => {
    const cases = [
      ['(?x)a', 'a'],
      ['(?-x)a', 'a'],
      ['(?x-x)a', 'a'],
      ['(?ix)a', '(?i)a'],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not remove necessary flags from flag directives', () => {
    const cases = [
      '(?i)a',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should remove useless top-level flags', () => {
    expect(optimize(r`a\y`, {flags: 'xy{g}', override: thisOverride}).flags).toBe('');
  });

  it('should not remove necessary top-level flags', () => {
    expect(optimize(r`a\y`, {flags: 'iy{w}', override: thisOverride}).flags).toBe('iy{w}');
  });

  it('should account for order of text segment mode flags', () => {
    expect(optimize(r`a\y`, {flags: 'xy{w}y{g}', override: thisOverride}).flags).toBe('');
    expect(optimize(r`a\y`, {flags: 'iy{g}y{w}', override: thisOverride}).flags).toBe('iy{w}');
  });
});

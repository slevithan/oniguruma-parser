import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';
import {describe, expect, it} from 'vitest';

describe('Optimizer', () => {
  describe('optimize', () => {
    it('should combine all optimizations correctly for a collection of example patterns', () => {
      const cases = [
        ['[[^[^a]]&&[b]]', '[a&&b]'],
        [r`a(?#comment\)) (b (?x)| c) #d${'\n'}(?x)e#comment${'\n'}f`, r`a (b |c) #d\nef`],
        [r`(?x) (?:\!{1,}) (\b(?:ark|arm|art)\b) [[^0-9A-Fa-f]\P{^Nd}\p{ Letter }]`, r`!+\b(ar[kmt])\b[\H\d\p{L}]`],
        [r`[0-9A-Fa-fg]`, r`[g\h]`], // Not `[0-9A-Fa-g]`
        ['===|!==|==|!=', '[!=]==?'],
      ];
      for (const [input, expected] of cases) {
        expect(optimize(input)).toEqual({
          pattern: expected,
          flags: '',
        });
      }
    });
  });

  describe('getOptionalOptimizations', () => {
    it('should return an object with optimization keys set to their default value', () => {
      expect(getOptionalOptimizations().removeEmptyGroups).toBe(true);
    });

    it('should set all values to false with option disable', () => {
      const optimizations = getOptionalOptimizations({disable: true});
      for (const key of Object.keys(optimizations)) {
        expect(optimizations[key]).toBe(false);
      }
    });
  });
});

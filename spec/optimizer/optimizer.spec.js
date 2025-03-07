import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer', () => {
  describe('optimize', () => {
    it('should combine all optimizations correctly for a collection of example patterns', () => {
      const cases = [
        ['[[^[^a]]&&[b]]', '[a&&b]'],
        [r`a(?#comment\)) (b (?x)| c) #d${'\n'}(?x)e#comment${'\n'}f`, r`a (b |c) #d\nef`],
        // Readme example
        [r`(?x) (?:\!{1,}) (\p{Nd}aa|\p{Nd}ab|\p{Nd}az) [[^0-9A-Fa-f]\p{ Letter }] [\x00-\x{10FFFF}] [\p{L}\p{M}\p{N}\p{Pc}]`, r`!+(\da[abz])[\H\p{L}]\O\w`],
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

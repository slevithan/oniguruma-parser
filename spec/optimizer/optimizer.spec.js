import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';

describe('Optimizer', () => {
  describe('optimize', () => {
    it('should exclude flag x in output flags', () => {
      expect(optimize('', {flags: 'ix'})).toEqual({
        pattern: '',
        flags: 'i',
      });
    });

    it('should combine all optimizations correctly for a collection of example patterns', () => {
      const cases = [
        ['[[^[^a]]&&[b]]', '[a&&b]'],
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

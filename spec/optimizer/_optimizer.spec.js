import {optimize} from '../../dist/optimizer/optimize.js';

describe('Optimizer', () => {
  it('should apply all optimizations for a list of patterns', () => {
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

import {optimize} from '../../dist/optimizer/optimize.js';

describe('Optimizer', () => {
  xit('should apply all optimizations for a list of examples', () => {
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

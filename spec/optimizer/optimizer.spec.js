import {optimize} from '../../dist/optimizer/optimize.js';

describe('Optimizer', () => {
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

import {optimize, getOptionalOptimizations} from '../../dist/optimizer/optimize.js';
import {r} from '../../dist/utils.js';

describe('Optimizer: exposeAnchors', () => {
  function thisOptimization(pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        exposeAnchors: true,
      },
    }).pattern;
  }

  it('should pull leading and trailing assertions out of unquantified capturing groups', () => {
    const cases = [
      ['(^)', '^()'],
      ['(^a)', '^(a)'],
      ['(^^a)', '^^(a)'],
      ['($)', '$()'],
      ['(a$)', '(a)$'],
      ['(a$$)', '(a)$$'],
      ['(^$)', '^()$'],
      ['(^$^)', '^$()^'],
      ['(^^$$)', '^^()$$'],
      ['(^a$)', '^(a)$'],
      ['(^^a$$)', '^^(a)$$'],
      [r`(\G\b\y\Z)`, r`\G\b()\y\Z`],
    ];
    for (const [input, expected] of cases) {
      expect(thisOptimization(input)).toBe(expected);
    }
  });

  it('should not alter quantified groups', () => {
    const cases = [
      '(^)*',
      '(^)+',
      '(^a)?',
      '(^a)??',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });

  it('should not alter other ineligible groups', () => {
    const cases = [
      '(a)',
      '(?:^)',
      '((?=))',
    ];
    for (const input of cases) {
      expect(thisOptimization(input)).toBe(input);
    }
  });
});

import {toOnigurumaAst} from '../../dist/index.js';
import {generate} from '../../dist/generator/generate.js';
import {r} from '../../dist/utils.js';

describe('generate: NamedCallout', () => {
  function gen(pattern) {
    return generate(toOnigurumaAst(pattern)).pattern;
  }

  it('should support all named callout names', () => {
    const cases = [
      '(*FAIL)',
      '(*MISMATCH)',
      '(*SKIP)',
      '(*ERROR)',
      '(*MAX{1})',
      '(*COUNT)',
      '(*TOTAL_COUNT)',
      '(*CMP{5,>=,4})',
    ];
    for (const input of cases) {
      expect(gen(input)).toBe(input);
    }
  });

  it('should support tag', () => {
    const cases = [
      '(*FAIL[Tag])',
      '(*MISMATCH[Tag])',
      '(*SKIP[Tag])',
      '(*ERROR[Tag])',
      '(*MAX[Tag]{1})',
      '(*COUNT[Tag])',
      '(*TOTAL_COUNT[Tag])',
      '(*CMP[Tag]{5,>=,4})',
    ];
    for (const input of cases) {
      expect(gen(input)).toBe(input);
    }
  });

  it('should support redundant argument syntax', () => {
    const cases = [
      '(*FAIL{})',
      '(*MISMATCH{,})',
      '(*SKIP{,,})',
      '(*ERROR{,,,})',
      '(*MAX{1,,})',
      '(*COUNT{,,2})',
      '(*TOTAL_COUNT{,,3,,})',
      '(*CMP{,1,,==,,,3,,,,})',
    ];
    for (const input of cases) {
      expect(gen(input)).toBe(input);
    }
  });

  // https://github.com/kkos/oniguruma/blob/master/doc/CALLOUTS.BUILTIN
  // https://github.com/kkos/oniguruma/blob/3eb317dc4413692e4eaa92a68839c74aa74fbc77/test/test_utf8.c#L1376-L1382
  // https://github.com/kkos/oniguruma/blob/3eb317dc4413692e4eaa92a68839c74aa74fbc77/sample/callout.c#L242-L256
  // https://github.com/kkos/oniguruma/blob/3eb317dc4413692e4eaa92a68839c74aa74fbc77/sample/count.c#L106-L116
  it('should support large examples', () => {
    const cases = [
      '(?:(*COUNT[T]{X})a)*(?:(*MAX{T})c)*',
      '(?:(*MAX[TA]{7})a|(*MAX[TB]{5})b)*(*CMP{TA,>=,4})',
      '(?:[ab]|(*MAX{2}).)*',
      '(?:(*COUNT[AB]{X})[ab]|(*COUNT[CD]{X})[cd])*(*CMP{AB,<,CD})',
      'abc(?:(*FAIL)|$)',
      'abc(?:$|(*MISMATCH)|abc$)',
      'abc(?:(*ERROR)|$)',
      'abc(d|(*ERROR{-999}))',
      '(?:a(*MAX{2})|b)*',
      '(?:(*MAX{2})a|b)*',
      '(?:(*MAX{1})a|b)*',
      '(?:(*MAX{3})a|(*MAX{4})b)*',
      '(?:(*MAX[A]{3})a|(*MAX[B]{5})b)*(*CMP{A,<,B})',
      '(?:(*MAX[A]{007})a|(*MAX[B]{+005})b)*(*CMP{A,>=,4})',
      '(?:(*MAX[T]{3})a)*(?:(*MAX{T})c)*',
      'abc(.(*COUNT[x]))*(*FAIL)',
      'abc(.(*COUNT[_any_]))*(.(*COUNT[x]))*d',
      'abc(.(*COUNT[x]{<}))*f',
      'abc(.(*COUNT[x]{X}))*f',
      'abc(.(*COUNT[x]))*f',
      'a(.(*COUNT[x]))*z',
      'a(.(*TOTAL_COUNT[x]))*z',
      // '(?(*FAIL)123|456)', // TODO: conditionals
      // r`\A(?(*FAIL)then|else)\z`, // TODO: conditionals
    ];
    for (const input of cases) {
      expect(gen(input)).toBe(input);
    }
  });

  it('should throw for invalid syntax', () => {
    const cases = [
      '(*',
      '(*FAIL@)',
      '(*FAIL{1})',
      '(*MISMATCH[])',
      '(*SKIP[@])',
      '(*ERROR{2,3})',
      '(*ERROR{T})',
      '(*MAX)',
      '(*MAX{1,X,3})',
      '(*COUNT[0])',
      '(*TOTAL_COUNT{S})',
      '(*TOTAL_COUNT{1,2})',
      '(*CMP{1,==})',
      '(*CMP[tag]{1,==,3,4})',
    ];
    for (const input of cases) {
      expect(() => gen(input)).toThrow();
    }
  });

  it('should throw for unsupported custom named callouts', () => {
    const cases = [
      '(*foo)',
      '(*foo[Tag])',
      '(*foo{,1,@,A,,,anything,[]})',
      'ab(*foo{})(*FAIL)',
      r`\A(*foo)abc`,
      `ab(*bar{372,I am a bar's argument,あ})c(*FAIL)`,
      'ab(*bar{1234567890})',
    ];
    for (const input of cases) {
      expect(() => gen(input)).toThrow();
    }
  });

  // TODO: empty arguments can be optimized out. move to ./optimizer
  xit('should optimize arguments. oniguruma skips over/ignores redundant/unnecessary commas', () => {
    const cases = [
      ['(*FAIL{})', '(*FAIL)'],
      ['(*MISMATCH{,})', '(*MISMATCH)'],
      ['(*SKIP{,,})', '(*SKIP)'],
      ['(*ERROR{,,,})', '(*ERROR)'],
      ['(*MAX{1,,})', '(*MAX{1})'],
      ['(*COUNT{,,2})', '(*COUNT{2})'],
      ['(*TOTAL_COUNT{,,3,,})', '(*TOTAL_COUNT{3})'],
      ['(*CMP{,T,,==,,,5,,,,})', '(*CMP{T,==,5})'],
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected);
    }
  });

});

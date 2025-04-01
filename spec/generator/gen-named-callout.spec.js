import {toOnigurumaAst} from '../../dist/index.js';
import {generate} from '../../dist/generator/generate.js';

describe('generate: Named Callout', () => {
  function gen(pattern) {
    return generate(toOnigurumaAst(pattern)).pattern;
  }

  it('should support all named callout names', () => {
    const cases = [
      ['(*FAIL)'],
      ['(*MISMATCH)'],
      ['(*SKIP)'],
      ['(*ERROR)'],
      ['(*MAX{1})'],
      ['(*COUNT)'],
      ['(*TOTAL_COUNT)'],
      ['(*CMP{5,>=,4})'],
      // ['(*foo)'], // Error: Invalid callout name "foo"
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected ?? input);
    }
  });

  it('should support tag', () => {
    const cases = [
      ['(*FAIL[Tag])'],
      ['(*MISMATCH[Tag])'],
      ['(*SKIP[Tag])'],
      ['(*ERROR[Tag])'],
      ['(*MAX[Tag]{1})'],
      ['(*COUNT[Tag])'],
      ['(*TOTAL_COUNT[Tag])'],
      ['(*CMP[Tag]{5,>=,4})'],
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected ?? input);
    }
  });

  it('should support empty args', () => {
    const cases = [
      ['(*FAIL{})'],
      ['(*MISMATCH{,})'],
      ['(*SKIP{,,})'],
      ['(*ERROR{,,,})'],
      ['(*MAX{1,,})'],
      ['(*COUNT{,,2})'],
      ['(*TOTAL_COUNT{,,3,,})'],
      ['(*CMP{,1,,==,,,3,,,,})'],
      // TODO: empty args can be optimized out
      // ['(*FAIL{})', '(*FAIL)'],
      // ['(*MISMATCH{,})', '(*MISMATCH)'],
      // ['(*SKIP{,,})', '(*SKIP)'],
      // ['(*ERROR{,,,})', '(*ERROR)'],
      // ['(*MAX{1,,})', '(*MAX{1})'],
      // ['(*COUNT{,,2})', '(*COUNT{2})'],
      // ['(*TOTAL_COUNT{,,3,,})', '(*TOTAL_COUNT{3})'],
      // ['(*CMP{,T,,==,,,5,,,,})', '(*CMP{T,==,5})'],
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected ?? input);
    }
  });

  // https://github.com/kkos/oniguruma/blob/master/doc/CALLOUTS.BUILTIN
  // https://github.com/kkos/oniguruma/blob/master/test/test_utf8.c#L1369-L1375
  // https://github.com/kkos/oniguruma/blob/master/sample/callout.c#L243-L256
  // https://github.com/kkos/oniguruma/blob/master/sample/count.c#L106-L116
  it('should support large examples', () => {
    const cases = [
      ['(?:(*COUNT[T]{X})a)*(?:(*MAX{T})c)*'],
      ['(?:(*MAX[TA]{7})a|(*MAX[TB]{5})b)*(*CMP{TA,>=,4})'],
      ['(?:[ab]|(*MAX{2}).)*'],
      ['(?:(*COUNT[AB]{X})[ab]|(*COUNT[CD]{X})[cd])*(*CMP{AB,<,CD})'],
      // ['(?(*FAIL)123|456)'], // conditionals
      // ['\\A(*foo)abc'], // Error: Invalid callout name "foo"
      ['abc(?:(*FAIL)|$)'],
      ['abc(?:$|(*MISMATCH)|abc$)'],
      ['abc(?:(*ERROR)|$)'],
      // ['ab(*foo{})(*FAIL)'], // Error: Invalid callout name "foo"
      ['abc(d|(*ERROR{-999}))'],
      // ['ab(*bar{372,I am a bar\'s argument,あ})c(*FAIL)'], // Error: Invalid callout name "bar"
      // ['ab(*bar{1234567890})'], // Error: Invalid callout name "bar"
      ['(?:a(*MAX{2})|b)*'],
      ['(?:(*MAX{2})a|b)*'],
      ['(?:(*MAX{1})a|b)*'],
      ['(?:(*MAX{3})a|(*MAX{4})b)*'],
      ['(?:(*MAX[A]{3})a|(*MAX[B]{5})b)*(*CMP{A,<,B})'],
      ['(?:(*MAX[A]{007})a|(*MAX[B]{+005})b)*(*CMP{A,>=,4})'],
      ['(?:(*MAX[T]{3})a)*(?:(*MAX{T})c)*'],
      // ['\\A(?(*FAIL)then|else)\\z'], // conditionals
      ['abc(.(*COUNT[x]))*(*FAIL)'],
      ['abc(.(*COUNT[_any_]))*(.(*COUNT[x]))*d'],
      ['abc(.(*COUNT[x]{<}))*f'],
      ['abc(.(*COUNT[x]{X}))*f'],
      ['abc(.(*COUNT[x]))*f'],
      ['a(.(*COUNT[x]))*z'],
      ['a(.(*TOTAL_COUNT[x]))*z'],
    ];
    for (const [input, expected] of cases) {
      expect(gen(input)).toBe(expected ?? input);
    }
  });

});

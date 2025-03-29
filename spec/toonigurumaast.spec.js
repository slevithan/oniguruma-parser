import {toOnigurumaAst} from '../dist/index.js';
import {singleAltAst} from './utils.js';

describe('toOnigurumaAst', () => {
  it('should throw for non-string patterns', () => {
    expect(() => toOnigurumaAst()).toThrow();
    for (const value of [undefined, null, 0, false, [], {}, /(?:)/]) {
      expect(() => toOnigurumaAst(value)).toThrow();
    }
  });

  it('should return a tree if given an empty string', () => {
    expect(toOnigurumaAst('')).toEqual(singleAltAst([]));
  });
});

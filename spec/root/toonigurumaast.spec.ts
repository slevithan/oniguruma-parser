import {toOnigurumaAst} from '../../dist/index.js';
import {singleAltAst} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('toOnigurumaAst', () => {
  it('should throw for non-string patterns', () => {
    // @ts-expect-error
    expect(() => toOnigurumaAst()).toThrow();
    for (const value of [undefined, null, 0, false, [], {}, /(?:)/]) {
      // @ts-expect-error
      expect(() => toOnigurumaAst(value)).toThrow();
    }
  });

  it('should return a tree if given an empty string', () => {
    expect(toOnigurumaAst('')).toEqual(singleAltAst([]));
  });
});

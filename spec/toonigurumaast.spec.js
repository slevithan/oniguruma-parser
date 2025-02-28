import {toOnigurumaAst} from '../dist/index.js';

describe('toOnigurumaAst', () => {
  it('should throw for non-string patterns', () => {
    expect(() => toOnigurumaAst()).toThrow();
    for (const value of [undefined, null, 0, false, [], {}, /(?:)/]) {
      expect(() => toOnigurumaAst(value)).toThrow();
    }
  });

  it('should return a tree if given an empty string', () => {
    const ast = {
      type: 'Regex',
      pattern: {
        type: 'Pattern',
        alternatives: [
          {
            type: 'Alternative',
            elements: [],
          },
        ],
      },
      flags: {
        type: 'Flags',
        digitIsAscii: false,
        dotAll: false,
        extended: false,
        ignoreCase: false,
        posixIsAscii: false,
        spaceIsAscii: false,
        wordIsAscii: false,
      },
    };
    expect(toOnigurumaAst('')).toEqual(ast);
  });
});

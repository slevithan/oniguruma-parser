import {parse, type OnigurumaAst} from './parser/parse.js';
import {OnigUnicodePropertyMap} from './unicode.js';

export type Options = {
  flags?: string;
  rules?: {
    captureGroup?: boolean;
    singleline?: boolean;
  };
};

/**
Returns an Oniguruma AST generated from an Oniguruma pattern.
@param {string} pattern Oniguruma regex pattern.
@param {Options} [options]
@returns {OnigurumaAst}
*/
function toOnigurumaAst(pattern: string, options: Options = {}): OnigurumaAst {
  if ({}.toString.call(options) !== '[object Object]') { // typeof options !== 'object'
    throw new Error('Unexpected options');
  }
  return parse(pattern, {
    // Limit the options that can be passed to the parser
    flags: options.flags ?? '',
    rules: {
      captureGroup: options.rules?.captureGroup ?? false,
      singleline: options.rules?.singleline ?? false,
    },
    unicodePropertyMap: OnigUnicodePropertyMap,
  });
}

export {
  toOnigurumaAst,
};

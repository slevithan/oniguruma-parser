import {parse} from './parser/parse.js';
import {OnigUnicodePropertyMap} from './unicode.js';

/**
Returns an Oniguruma AST generated from an Oniguruma pattern.
@param {string} pattern Oniguruma regex pattern.
@param {{
  flags?: string;
  rules?: {
    captureGroup?: boolean;
    singleline?: boolean;
  };
}} [options]
@returns {import('./parser/parse.js').OnigurumaAst}
*/
function toOnigurumaAst(pattern, options = {}) {
  if ({}.toString.call(options) !== '[object Object]') {
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

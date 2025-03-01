import {generate} from './generator/generate.js';
import {optimize} from './optimizer/optimize.js';
import {parse} from './parser/parse.js';
import {traverse} from './traverser/traverse.js';
import {OnigUnicodePropertyMap} from './unicode-properties.js';
import {slug} from './utils.js';

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
  generate,
  optimize,
  parse,
  slug,
  traverse,
  toOnigurumaAst,
};

import {generate} from './generator/generate.js';
import {optimize} from './optimizer/optimize.js';
import {parse} from './parser/parse.js';
import {traverse} from './traverser/traverse.js';
import {OnigUnicodePropertyMap} from './unicode-properties.js';

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

/**
Generates a Unicode property lookup name: lowercase, without spaces, hyphens, or underscores.
@param {string} name Unicode property name.
@returns {string}
*/
function slug(name) {
  return name.replace(/[- _]+/g, '').toLowerCase();
}

export {
  generate,
  optimize,
  parse,
  slug,
  traverse,
  toOnigurumaAst,
};

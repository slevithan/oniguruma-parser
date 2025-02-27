import {generate} from './generator/index.js';
import {optimize} from './optimizer/index.js';
import {parse} from './parser/index.js';
import {tokenize} from './tokenizer/index.js';
import {traverse} from './traverser/index.js';
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
@returns {import('./parser/index.js').OnigurumaAst}
*/
function toOnigurumaAst(pattern, options) {
  const opts = {
    flags: '',
    ...options,
    rules: {
      captureGroup: false,
      singleline: false,
      ...(options?.rules),
    },
  };
  return parse(tokenize(pattern, opts.flags, opts.rules), {
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
  tokenize,
  traverse,
  toOnigurumaAst,
};

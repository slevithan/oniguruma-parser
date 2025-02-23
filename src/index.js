import {parse} from './parse.js';
import {tokenize} from './tokenize.js';

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
@returns {import('./parse.js').OnigurumaAst}
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
    unicodePropertyMap: null, // TODO
  });
}

/**
Returns an Oniguruma AST generated from an Oniguruma pattern, allowing for custom Unicode property
names. This is useful when you want to reduce bundle size by skipping Unicode property name
validation, or when you want to use a custom map of valid names.
@param {string} pattern Oniguruma regex pattern.
@param {{
  flags?: string;
  normalizeUnknownPropertyNames?: boolean;
  unicodePropertyMap?: Map<string, string>;
  rules?: {
    captureGroup?: boolean;
    singleline?: boolean;
  };
}} [options]
@returns {import('./parse.js').OnigurumaAst}
*/
function toOnigurumaAstWithCustomUnicodeData(pattern, options) {
  const opts = {
    flags: '',
    normalizeUnknownPropertyNames: false,
    unicodePropertyMap: null,
    ...options,
    rules: {
      captureGroup: false,
      singleline: false,
      ...(options?.rules),
    },
  };
  return parse(tokenize(pattern, opts.flags, opts.rules), {
    normalizeUnknownPropertyNames: opts.normalizeUnknownPropertyNames,
    unicodePropertyMap: opts.unicodePropertyMap,
  });
}

export {
  toOnigurumaAst,
  toOnigurumaAstWithCustomUnicodeData,
};

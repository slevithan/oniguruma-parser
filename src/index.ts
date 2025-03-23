import {parse} from './parser/parse.js';
import type {OnigurumaAst} from './parser/parse.js';
import {OnigUnicodePropertyMap} from './unicode.js';

type ToOnigurumaAstOptions = {
  flags?: string;
  rules?: {
    captureGroup?: boolean;
    singleline?: boolean;
  };
};

/**
Returns an Oniguruma AST generated from an Oniguruma pattern.
*/
function toOnigurumaAst(pattern: string, options: ToOnigurumaAstOptions = {}): OnigurumaAst {
  // If `options` provided, it must be a plain object (excluding `null`, arrays, etc.)
  if ({}.toString.call(options) !== '[object Object]') {
    throw new Error('Unexpected options');
  }
  return parse(pattern, {
    // The parser includes additional options; limit the options that can be passed
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

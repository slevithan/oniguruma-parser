import {AstAssertionKinds, AstTypes, parse} from './parse.js';
import {tokenize} from './tokenize.js';
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
    unicodePropertyMap: OnigUnicodePropertyMap,
  });
}

/**
Check whether the node has exactly one alternative with one child element, and optionally that the
child satisfies a condition.
@param {{alternatives: Array<{
  type: 'Alternative';
  elements: Array<{type: string;}>;
}>;}} node
@param {(node: {type: string;}) => boolean} [kidFn]
@returns {boolean}
*/
function hasOnlyChild({alternatives}, kidFn) {
  return (
    alternatives.length === 1 &&
    alternatives[0].elements.length === 1 &&
    (!kidFn || kidFn(alternatives[0].elements[0]))
  );
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
  hasOnlyChild,
  slug,
  toOnigurumaAst,
};

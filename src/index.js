import {AstAssertionKinds, AstTypes, parse} from './parse.js';
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

function hasOnlyChild({alternatives}, kidFn) {
  return (
    alternatives.length === 1 &&
    alternatives[0].elements.length === 1 &&
    (!kidFn || kidFn(alternatives[0].elements[0]))
  );
}

// Consumptive groups add to the match.
// - Includes: Capturing, named capturing, noncapturing, atomic, and flag groups.
// - Excludes: Lookarounds.
//   - Special case: Absent functions are consumptive (and negated, quantified) but are different
//     in other ways so are excluded here.
// See also `AstTypeAliases.AnyGroup`.
function isConsumptiveGroup({type}) {
  return type === AstTypes.CapturingGroup || type === AstTypes.Group;
}

function isLookaround({type, kind}) {
  return (
    type === AstTypes.Assertion &&
    (kind === AstAssertionKinds.lookahead || kind === AstAssertionKinds.lookbehind)
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
  isConsumptiveGroup,
  isLookaround,
  slug,
  toOnigurumaAst,
  toOnigurumaAstWithCustomUnicodeData,
};

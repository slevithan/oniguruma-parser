import {generate} from '../generator/generate.js';
import {parse} from '../parser/parse.js';
import {traverse} from '../traverser/traverse.js';
import {OnigUnicodePropertyMap} from '../unicode.js';
import {optimizations, type OptimizationName} from './optimizations.js';

type Options = {
  flags?: string;
  override?: {[key in OptimizationName]?: boolean};
  rules?: {
    allowOrphanBackrefs?: boolean;
    captureGroup?: boolean;
    singleline?: boolean;
  };
};
/**
Returns an optimized Oniguruma pattern and flags.
@param {string} pattern Oniguruma regex pattern.
@param {Options} [options]
@returns {{
  pattern: string;
  flags: string;
}}
*/
function optimize(pattern: string, options: Options) {
  const opts = getOptions(options);
  const ast = parse(pattern, {
    flags: opts.flags,
    rules: {
      captureGroup: opts.rules.captureGroup,
      singleline: opts.rules.singleline,
    },
    skipBackrefValidation: opts.rules.allowOrphanBackrefs,
    unicodePropertyMap: OnigUnicodePropertyMap,
  });
  const active = Object.assign(getOptionalOptimizations(), opts.override);
  Object.keys(active).forEach(key => {
    if (!active[key]) {
      delete active[key];
    }
  });
  const names = <OptimizationName[]>Object.keys(active);
  let optimized = {pattern, flags: null};
  let counter = 0;
  do {
    if (++counter > 200) {
      throw new Error('Optimization exceeded maximum iterations; possible infinite loop');
    }
    pattern = optimized.pattern;
    for (const name of names) {
      traverse(ast, optimizations.get(name));
    }
    optimized = generate(ast);
  // Continue until no further optimization progress is made
  } while (pattern !== optimized.pattern);
  return optimized;
}

function getOptions(options: Options = {}) {
  return {
    // Oniguruma flags; a string with `imxDPSW` in any order (all optional). Oniguruma's `m` is
    // equivalent to JavaScript's `s` (`dotAll`).
    flags: '',
    // Enable or disable individual, optional optimizations to change their default state.
    override: {},
    ...options,
    rules: {
      // Useful with TextMate grammars that merge backreferences across patterns.
      allowOrphanBackrefs: false,
      // Allow unnamed captures and numbered calls (backreferences and subroutines) when using
      // named capture. This is Oniguruma option `ONIG_OPTION_CAPTURE_GROUP`; on by default in
      // `vscode-oniguruma`.
      captureGroup: false,
      // `^` as `\A`; `$` as`\Z`. This is Oniguruma option `ONIG_OPTION_SINGLELINE`.
      singleline: false,
      ...options.rules,
    },
  };
}

type OptimizationNames = {[key in OptimizationName]: boolean};
/**
@param {{
  disable?: boolean;
}} [options]
@returns {OptimizationNames}
*/
function getOptionalOptimizations({disable}: {disable?: boolean;} = {}): OptimizationNames {
  const obj = {};
  for (const key of optimizations.keys()) {
    obj[key] = !disable;
  }
  return <OptimizationNames>obj;
}

export {
  getOptionalOptimizations,
  optimize,
};

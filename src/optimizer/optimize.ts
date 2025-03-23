import {generate} from '../generator/generate.js';
import type {OnigurumaRegex} from '../generator/generate.js';
import {parse} from '../parser/parse.js';
import {traverse} from '../traverser/traverse.js';
import {OnigUnicodePropertyMap} from '../unicode.js';
import {optimizations} from './optimizations.js';
import type {OptimizationName} from './optimizations.js';

type OptimizerOptions = {
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
*/
function optimize(pattern: string, options?: OptimizerOptions): OnigurumaRegex {
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
  Object.keys(active).forEach((key: OptimizationName) => {
    if (!active[key]) {
      delete active[key];
    }
  });
  const names = <Array<OptimizationName>>Object.keys(active);
  let optimized: OnigurumaRegex = {pattern, flags: opts.flags};
  let counter = 0;
  do {
    if (++counter > 200) {
      throw new Error('Optimization exceeded maximum iterations; possible infinite loop');
    }
    pattern = optimized.pattern;
    for (const name of names) {
      traverse(ast, optimizations.get(name)!); // TypeSystem fails on Map
    }
    optimized = generate(ast);
  } while (
    // Continue until no further optimization progress is made
    pattern !== optimized.pattern
  );
  return optimized;
}

function getOptions(options: OptimizerOptions = {}) {
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

function getOptionalOptimizations({disable}: {disable?: boolean} = {}) {
  const obj: Partial<OptimizationNames> = {};
  for (const key of optimizations.keys()) {
    obj[key] = !disable;
  }
  return obj as OptimizationNames;
}

export {
  getOptionalOptimizations,
  optimize,
};

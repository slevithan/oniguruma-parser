import {generate} from '../generator/generate.js';
import type {OnigurumaRegex} from '../generator/generate.js';
import {parse} from '../parser/parse.js';
import {traverse} from '../traverser/traverse.js';
import {OnigUnicodePropertyMap} from '../unicode.js';
import {optimizations} from './optimizations.js';
import type {OptimizationName} from './optimizations.js';

type OptimizationStates = {[key in OptimizationName]: boolean};

type OptimizeOptions = {
  flags?: string;
  override?: Partial<OptimizationStates>;
  rules?: {
    allowOrphanBackrefs?: boolean;
    captureGroup?: boolean;
    singleline?: boolean;
  };
};

/**
Returns an optimized Oniguruma pattern and flags.
*/
function optimize(pattern: string, options?: OptimizeOptions): OnigurumaRegex {
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
  for (const key of optimizations.keys()) {
    if (!active[key]) {
      delete active[key];
    }
  }
  const names = Object.keys(active) as Array<OptimizationName>;
  let optimized: OnigurumaRegex = {pattern, flags: opts.flags};
  let counter = 0;
  do {
    if (++counter > 200) {
      throw new Error('Optimization exceeded maximum iterations; possible infinite loop');
    }
    pattern = optimized.pattern;
    for (const name of names) {
      traverse(ast, optimizations.get(name)!);
    }
    optimized = generate(ast);
  } while (
    // Continue until no further optimization progress is made
    pattern !== optimized.pattern
  );
  return optimized;
}

function getOptions(options: OptimizeOptions = {}): Required<OptimizeOptions> {
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

function getOptionalOptimizations(options: {disable?: boolean} = {}): OptimizationStates {
  const obj = {} as OptimizationStates;
  for (const key of optimizations.keys()) {
    obj[key] = !options.disable;
  }
  return obj;
}

export {
  getOptionalOptimizations,
  optimize,
  type OptimizeOptions,
};

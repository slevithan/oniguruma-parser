import {toOnigurumaAst} from '../index.js';
import {generate} from '../generator/generate.js';
import {traverse} from '../traverser/traverse.js';
import {optimizations} from './optimizations.js';

/**
Returns an optimized Oniguruma pattern and flags.
@param {string} pattern Oniguruma regex pattern.
@param {{
  flags?: string;
  override?: {[key in import('./optimizations.js').OptimizationName]?: boolean};
  rules?: {
    captureGroup?: boolean;
    singleline?: boolean;
  };
}} [options]
@returns {{
  pattern: string;
  flags: string;
}}
*/
function optimize(pattern, options) {
  const opts = getOptions(options);
  const ast = toOnigurumaAst(pattern, {
    flags: opts.flags,
    rules: opts.rules,
  });
  const active = Object.assign(getAllOptimizations(), opts.override);
  Object.keys(active).forEach(key => {
    if (!active[key]) {
      delete active[key];
    }
  });
  const names = Object.keys(active);
  let optimized = {pattern};
  let counter = 0;
  do {
    if (++counter > 200) {
      throw new Error('Optimization loop exceeded maximum iterations');
    }
    pattern = optimized.pattern;
    for (const name of names) {
      traverse(ast, null, optimizations.get(name));
    }
    optimized = generate(ast);
  // Continue until no further optimization progress is made
  } while (pattern !== optimized.pattern);
  return optimized;
}

function getOptions(options = {}) {
  return {
    flags: '',
    override: {},
    rules: {},
    ...options,
  };
}

function getAllOptimizations({disable} = {}) {
  const obj = {};
  for (const key of optimizations.keys()) {
    obj[key] = !disable;
  }
  return obj;
}

export {
  getAllOptimizations,
  optimize,
};

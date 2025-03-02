import {toOnigurumaAst} from '../index.js';
import {generate} from '../generator/generate.js';
import {traverse} from '../traverser/traverse.js';
import {optimizations} from './optimizations.js';

/**
Returns an optimized Oniguruma pattern and flags.
@param {string} pattern Oniguruma regex pattern.
@param {{
  allow?: Array<import('./optimizations.js').OptimizationName>;
  flags?: string;
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
function optimize(pattern, options = {}) {
  const ast = toOnigurumaAst(pattern, {
    flags: options.flags ?? '',
    rules: options.rules ?? {},
  });
  const names = new Set(options.allow ?? optimizations.keys());
  let optimized = {pattern};
  let counter = 0;
  do {
    if (++counter > 200) {
      throw new Error('Optimization loop exceeded maximum iterations');
    }
    pattern = optimized.pattern;
    for (const name of names) {
      traverse({node: ast}, null, optimizations.get(name));
    }
    optimized = generate(ast);
  } while (pattern !== optimized.pattern);
  return optimized;
}

export {
  optimize,
};

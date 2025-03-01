import {toOnigurumaAst} from '../index.js';
import {generate} from '../generator/generate.js';
import {traverse} from '../traverser/traverse.js';
import {transforms} from './transforms.js';

/**
Returns an optimized Oniguruma pattern and flags.
@param {string} pattern Oniguruma regex pattern.
@param {{
  allow?: Array<import('./transforms.js').OptimizationName>;
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
  const names = new Set(options.allow ?? transforms.keys());
  let optimized = {pattern};
  let counter = 0;
  do {
    counter++;
    if (counter > 100) {
      throw new Error('Optimization loop exceeded 100 iterations');
    }
    pattern = optimized.pattern;
    for (const name of names) {
      traverse({node: ast}, null, transforms.get(name));
    }
    optimized = generate(ast);
  } while (pattern !== optimized.pattern);
  return optimized;
}

export {
  optimize,
};

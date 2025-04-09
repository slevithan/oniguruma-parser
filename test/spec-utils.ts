import type {OptimizationName} from '../dist/optimizer/optimizations.js';
import type {AlternativeElementNode, OnigurumaAst} from '../dist/parser/parse.js';
import {generate} from '../dist/generator/generate.js';
import {toOnigurumaAst} from '../dist/index.js'
import {getOptionalOptimizations, optimize} from '../dist/optimizer/optimize.js';

function gen(pattern: string): string {
  return generate(toOnigurumaAst(pattern)).pattern;
}

function getNarrowOptimizer(optimization: OptimizationName): (pattern: string) => string {
  return pattern => {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        [optimization]: true,
      },
    }).pattern;
  };
}

function singleAltAst(body: Array<AlternativeElementNode>): OnigurumaAst {
  return {
    type: 'Regex',
    body: [
      { type: 'Alternative',
        body,
      },
    ],
    flags: {
      type: 'Flags',
      digitIsAscii: false,
      dotAll: false,
      extended: false,
      ignoreCase: false,
      posixIsAscii: false,
      spaceIsAscii: false,
      wordIsAscii: false,
    },
  }
}

export {
  gen,
  getNarrowOptimizer,
  singleAltAst,
};

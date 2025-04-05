import {toOnigurumaAst} from '../dist/index.js'
import {generate} from '../dist/generator/generate.js';
import {AlternativeElementNode, OnigurumaAst} from '../dist/parser/parse.js';
import {traverse, Visitor} from '../dist/traverser/traverse.js';
import {OptimizationName} from '../dist/optimizer/optimizations.js';
import {getOptionalOptimizations, optimize} from '../dist/optimizer/optimize.js';

function gen(pattern: string): string {
  return generate(toOnigurumaAst(pattern)).pattern;
}

function getNarrowOptimizer(optimization: OptimizationName): (pattern: string) => string {
  return function (pattern) {
    return optimize(pattern, {
      override: {
        ...getOptionalOptimizations({disable: true}),
        [optimization]: true,
      },
    }).pattern;
  };
}

function singleAltAst(elements: Array<AlternativeElementNode>): OnigurumaAst {
  return {
    type: 'Regex',
    pattern: {
      type: 'Pattern',
      alternatives: [
        { type: 'Alternative',
          elements,
        },
      ],
    },
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

function traversed(ast: OnigurumaAst, visitor: Visitor, state = null): OnigurumaAst {
  traverse(ast, visitor, state);
  return ast;
}

export {
  gen,
  getNarrowOptimizer,
  singleAltAst,
  traversed,
};

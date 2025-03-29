import {traverse} from "../dist/traverser/traverse.js";

function singleAltAst(elements) {
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

function traversed(ast, visitor, state) {
  traverse(ast, visitor, state);
  return ast;
}

export {
  singleAltAst,
  traversed,
};

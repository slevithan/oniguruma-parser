import { hasOnlyChild } from '../../parser/node-utils.js';
import {NodeCharacterClassKinds, NodeTypes} from '../../parser/parse.js';

/**
Unwrap negated classes used to negate an individual character set.
Allows independently controlling this behavior and avoiding logic duplication in
`unwrapUselessClasses` and `unnestUselessClasses`.
*/
const unwrapNegationWrappers = {
  CharacterClass({node, parent, replaceWith}) {
    const {kind, negate, elements} = node;
    const kid = elements[0];
    if (
      !negate ||
      kind !== NodeCharacterClassKinds.union ||
      !hasOnlyChild(node) ||
      // Don't need to check if `kind` is in `universalCharacterSetKinds` because all character
      // sets valid in classes are in that set
      kid.type !== NodeTypes.CharacterSet
      // [TODO] Support `[^\n]` -> `\N`
    ) {
      return;
    }
    kid.negate = !kid.negate;
    // Might unnest into a class or unwrap if this is already an outermost class
    replaceWith(kid, {traverse: true});
  },
};

export {
  unwrapNegationWrappers,
};

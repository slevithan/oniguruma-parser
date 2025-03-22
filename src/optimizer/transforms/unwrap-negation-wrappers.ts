import {createCharacterSet, NodeCharacterClassKinds, NodeCharacterSetKinds, NodeQuantifierKinds, NodeTypes} from '../../parser/parse.js';

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
      elements.length !== 1
    ) {
      return;
    }
    // Don't need to check if `kind` is in `universalCharacterSetKinds` because all character
    // sets valid in classes are in that set
    if (kid.type === NodeTypes.CharacterSet) {
      kid.negate = !kid.negate;
      // Might unnest into a class or unwrap into a non-class
      replaceWith(kid);
    } else if (
      parent.type !== NodeTypes.CharacterClass &&
      kid.type === NodeTypes.Character &&
      kid.value === 10 // '\n'
    ) {
      if (parent.type === NodeTypes.Quantifier && parent.kind !== NodeQuantifierKinds.lazy) {
        // Avoid introducing a trigger for an Oniguruma bug; see <github.com/rosshamish/kuskus/issues/209>
        return;
      }
      // `[^\n]` -> `\N`; can only use `\N` if not in a class
      replaceWith(createCharacterSet(NodeCharacterSetKinds.newline, {negate: true}));
    }
  },
};

export {
  unwrapNegationWrappers,
};

import {NodeCharacterClassKinds, NodeTypes} from '../../parser/parse.js';
import type {CharacterClassNode} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';

/**
Unwrap outermost non-negated character classes containing a single character or character set.
See also `unwrapNegationWrappers`.
*/
const unwrapUselessClasses = {
  CharacterClass({node, parent, replaceWith}: Path & {node: CharacterClassNode}) {
    const {kind, negate, elements} = node;
    const kid = elements[0];
    if (
      parent.type === NodeTypes.CharacterClass ||
      negate ||
      kind !== NodeCharacterClassKinds.union ||
      elements.length !== 1 ||
      (kid.type !== NodeTypes.Character && kid.type !== NodeTypes.CharacterSet)
    ) {
      return;
    }
    replaceWith(kid, {traverse: true});
  },
};

export {
  unwrapUselessClasses,
};

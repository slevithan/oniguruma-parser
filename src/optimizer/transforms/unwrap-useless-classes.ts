import type {CharacterClassNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

/**
Unwrap outermost non-negated character classes containing a single character or character set.
See also `unwrapNegationWrappers`.
*/
const unwrapUselessClasses: Visitor = {
  CharacterClass({node, parent, replaceWith}: Path) {
    const {body, kind, negate} = node as CharacterClassNode;
    const kid = body[0];
    if (
      parent!.type === 'CharacterClass' ||
      negate ||
      kind !== 'union' ||
      body.length !== 1 ||
      (kid.type !== 'Character' && kid.type !== 'CharacterSet')
    ) {
      return;
    }
    replaceWith(kid, {traverse: true});
  },
};

export {
  unwrapUselessClasses,
};

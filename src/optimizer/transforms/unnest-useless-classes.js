import {hasOnlyChild} from '../../parser/node-utils.js';
import {NodeCharacterClassKinds, NodeTypes} from '../../parser/parse.js';

/**
Unnest character classes when possible.
See also `unwrapNegationWrappers`.
*/
const unnestUselessClasses = {
  CharacterClass({node, parent, replaceWith, replaceWithMultiple}) {
    const {kind, negate, elements} = node;
    if (
      // Don't use this to unwrap outermost classes; see `unwrapUselessClasses` for that
      parent.type !== NodeTypes.CharacterClass ||
      kind !== NodeCharacterClassKinds.union ||
      !elements.length
    ) {
      return;
    }
    const firstEl = elements[0];
    // Special case to unnest classes that are an only-kid of their parent, since it might flip
    // `negate` on the parent; ex:
    // `[[a]]` -> `[a]`; `[[^a]]` -> `[^a]`; `[^[a]]` -> `[^a]`; `[^[^a]]` -> `[a]`
    if (hasOnlyChild(parent, {
      type: NodeTypes.CharacterClass,
      kind: NodeCharacterClassKinds.union,
    })) {
      parent.negate = parent.negate !== negate;
      replaceWithMultiple(elements, {traverse: true});
      return;
    }
    // Remainder of options apply only if the class is non-negated
    if (negate) {
      return;
    }
    // Unnest all kids into a union class
    if (parent.kind === NodeCharacterClassKinds.union) {
      replaceWithMultiple(elements, {traverse: true});
    // Can unnest any one kid into an intersection class
    // [TODO] After supporting `format` for classes in the parser, can "unnest" any number of kids
    // into intersection by flipping this class's `format` from `'explicit'` to `'implicit'`,
    // rather than replacing it
    } else if (hasOnlyChild(node)) {
      replaceWith(firstEl, {traverse: true});
    }
  },
};

export {
  unnestUselessClasses,
};

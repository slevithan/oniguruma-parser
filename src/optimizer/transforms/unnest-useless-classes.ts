import type {CharacterClassNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';
import {hasOnlyChild} from '../../parser/node-utils.js';
import {throwIfNullable} from '../../utils.js';

/**
Unnest character classes when possible.
See also `unwrapNegationWrappers`.
*/
const unnestUselessClasses: Visitor = {
  CharacterClass({node, parent, replaceWith, replaceWithMultiple}: Path) {
    const {body, kind, negate} = node as CharacterClassNode;
    // @ts-expect-error TODO: Remove along with the `parent` type guard below it
    parent.type;
    parent = throwIfNullable(parent);
    if (
      // Don't use this to unwrap outermost classes; see `unwrapUselessClasses` for that
      parent.type !== 'CharacterClass' ||
      kind !== 'union' ||
      !body.length
    ) {
      return;
    }
    const firstEl = body[0];
    // Special case to unnest classes that are an only-kid of their parent, since it might flip
    // `negate` on the parent; ex:
    // `[[a]]` -> `[a]`; `[[^a]]` -> `[^a]`; `[^[a]]` -> `[^a]`; `[^[^a]]` -> `[a]`
    if (hasOnlyChild(parent, {
      type: 'CharacterClass',
      kind: 'union',
    })) {
      parent.negate = parent.negate !== negate;
      replaceWithMultiple(body, {traverse: true});
      return;
    }
    // Remainder of options apply only if the class is non-negated
    if (negate) {
      return;
    }
    // Unnest all kids into a union class
    if (parent.kind === 'union') {
      replaceWithMultiple(body, {traverse: true});
    // Can unnest any one kid into an intersection class
    // TODO: After supporting `format` for classes, can visually unnest any number of kids into
    // intersection by flipping this class's `format` from `'explicit'` to `'implicit'`, rather
    // than replacing it. See <github.com/slevithan/oniguruma-parser/issues/1>
    } else if (hasOnlyChild(node as CharacterClassNode)) {
      replaceWith(firstEl, {traverse: true});
    }
  },
};

export {
  unnestUselessClasses,
};

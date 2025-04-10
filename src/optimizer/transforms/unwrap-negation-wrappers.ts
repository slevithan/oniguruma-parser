import type {Visitor} from '../../traverser/traverse.js';
import {createCharacterSet} from '../../parser/parse.js';

/**
Unwrap negated classes used to negate an individual character set.
Allows independently controlling this behavior, and avoids logic duplication in
`unwrapUselessClasses` and `unnestUselessClasses`.
*/
const unwrapNegationWrappers: Visitor = {
  CharacterClass({node, parent, replaceWith}) {
    const {body, kind, negate} = node;
    if (!negate || kind !== 'union' || body.length !== 1) {
      return;
    }
    const kid = body[0];
    if (kid.type === 'CharacterSet') {
      kid.negate = !kid.negate;
      // Might unnest into a class or unwrap into a non-class. All character set kinds valid in a
      // class are also valid outside of a class, though the inverse isn't true
      replaceWith(kid);
    } else if (
      parent.type !== 'CharacterClass' &&
      kid.type === 'Character' &&
      kid.value === 10 // '\n'
    ) {
      if (parent.type === 'Quantifier' && parent.kind !== 'lazy') {
        // Avoid introducing a trigger for a `vscode-oniguruma` bug (v2.0.1 tested); see
        // <github.com/kkos/oniguruma/issues/347>
        return;
      }
      // `[^\n]` -> `\N`; can only use `\N` if not in a class
      replaceWith(createCharacterSet('newline', {negate: true}));
    }
  },
};

export {
  unwrapNegationWrappers,
};

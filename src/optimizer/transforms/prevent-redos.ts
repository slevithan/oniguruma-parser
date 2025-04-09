import type {QuantifierNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';
import {hasOnlyChild} from '../../parser/node-utils.js';

/**
Remove identified ReDoS vulnerabilities without changing matches.
*/
const preventReDoS: Visitor = {
  Quantifier(path: Path) {
    const {node} = path as Path<QuantifierNode>;
    // Prevent a common cause of catastrophic backtracking by removing an unneeded nested
    // quantifier from the first alternative of infinitely-quantified groups. Can't remove nested
    // quantifiers from other alternatives or when the first alternative contains more than one
    // node, because that might change the match
    // TODO: It's safe to skip this transform if the quantified group is the last node in the
    // pattern, since there's no backtracking trigger if there's no following node
    const {body, max} = node;
    if (
      max !== Infinity ||
      // Can't operate on capturing groups because that could change the captured value
      body.type !== 'Group' ||
      // No benefit with atomic groups
      body.atomic
    ) {
      return;
    }
    const firstAlt = body.body[0];
    if (!hasOnlyChild(firstAlt, {type: 'Quantifier'})) {
      return;
    }
    const nestedQuantifier = firstAlt.body[0] as QuantifierNode;
    if (
      // No benefit with possessive quantifiers
      nestedQuantifier.kind === 'possessive' ||
      nestedQuantifier.min > 1 ||
      nestedQuantifier.max < 2
    ) {
      return;
    }
    if (!nestedQuantifier.min) {
      // Ex: Change `*` or `{0,2}` to `?`; preserve laziness
      nestedQuantifier.max = 1;
    } else if (nestedQuantifier.min === 1) {
      // Ex: Remove `+` or `{1,2}`
      firstAlt.body[0] = nestedQuantifier.body;
    }
  },
};

export {
  preventReDoS,
};

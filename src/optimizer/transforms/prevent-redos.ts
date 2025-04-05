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
    // quantifiers from other alternatives or if the first alternative has more than one element,
    // because that might change the match
    // TODO: It's safe to skip this transform if the quantified group is the last node in its
    // pattern. If there's no following node, there's no backtracking trigger
    const {max, element} = node;
    if (
      max !== Infinity ||
      // Can't operate on capturing groups because that could change the captured value
      element.type !== 'Group' ||
      // No benefit with atomic groups
      element.atomic
    ) {
      return;
    }
    const firstAlt = element.alternatives[0];
    if (!hasOnlyChild(firstAlt, {type: 'Quantifier'})) {
      return;
    }
    const nestedQuantifier = firstAlt.elements[0] as QuantifierNode;
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
      firstAlt.elements[0] = nestedQuantifier.element;
    }
  },
};

export {
  preventReDoS,
};

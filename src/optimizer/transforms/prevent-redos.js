import {hasOnlyChild} from '../../parser/node-utils.js';
import {NodeQuantifierKinds, NodeTypes} from '../../parser/parse.js';

/**
Fix some ReDoS vulnerabilities.
*/
const preventReDoS = {
  Quantifier({node}) {
    // ## Prevent a common cause of catastrophic backtracking by removing an unneeded nested
    // quantifier from quantified groups
    // [TODO] Skip if the quantified group is the last node in the pattern. If there's no following
    // node, there's no backtracking trigger
    const {element} = node;
    if (
      node.max !== Infinity ||
      (element.type !== NodeTypes.CapturingGroup && element.type !== NodeTypes.Group) ||
      (element.type === NodeTypes.Group && element.atomic)
    ) {
      return;
    }
    const firstAlt = element.alternatives[0];
    if (!hasOnlyChild(firstAlt, {type: NodeTypes.Quantifier})) {
      return;
    }
    const nestedQuantifier = firstAlt.elements[0];
    if (
      // It's not a problem to also cover cases with a possessive quantifier, but leaving the
      // possesive quantifier in place can slightly improve performance
      nestedQuantifier.kind === NodeQuantifierKinds.possessive ||
      nestedQuantifier.min > 1 ||
      nestedQuantifier.max < 2 ||
      ( nestedQuantifier.element.type !== NodeTypes.Character &&
        nestedQuantifier.element.type !== NodeTypes.CharacterClass &&
        nestedQuantifier.element.type !== NodeTypes.CharacterSet
      )
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

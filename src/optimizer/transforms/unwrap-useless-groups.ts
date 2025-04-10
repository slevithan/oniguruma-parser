import type {AlternativeContainerNode, AlternativeElementNode, GroupNode, Node, QuantifiableNode} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';
import {isAlternativeContainer, quantifiableTypes} from '../../parser/node-utils.js';

/**
Unwrap nonbeneficial noncapturing and atomic groups.
*/
const unwrapUselessGroups: Visitor = {
  // Unwrap kid from the outside in, since the traverser doesn't support stepping multiple levels
  // up the tree
  '*'({node}) {
    if (!isAlternativeContainer(node)) {
      return;
    }
    if (hasMultiAltNoncapturingGroupOnlyChild(node)) {
      // Isn't needed in some cases like if `node` is itself a basic noncapturing group (since
      // there's already handling in `Group`), but it doesn't hurt to handle it here instead
      node.body = (node.body[0].body[0] as GroupNode).body;
    }
  },

  Group({node, parent, replaceWithMultiple}) {
    const {atomic, body, flags} = node;
    const firstAltEls = body[0].body;
    if (body.length > 1 || parent.type === 'Quantifier') {
      return;
    }
    let unwrap = false;
    if (atomic) {
      if (firstAltEls.every(({type}: AlternativeElementNode) => atomicTypes.has(type))) {
        unwrap = true;
      }
    // For flag groups, rely on `removeUselessFlags`, after which the group can be unwrapped in a
    // subsequent pass
    } else if (!flags) {
      unwrap = true;
    }
    if (unwrap) {
      replaceWithMultiple(firstAltEls, {traverse: true});
    }
  },

  // Unwrap quantified groups that contain a single quantifiable node
  Quantifier({node}) {
    if (node.body.type !== 'Group') {
      return;
    }
    const quantifiedGroup = node.body;
    if (quantifiedGroup.body.length > 1) {
      return;
    }
    const groupKids = quantifiedGroup.body[0].body;
    if (groupKids.length !== 1) {
      return;
    }
    const candidate = groupKids[0];
    if (
      !quantifiableTypes.has(candidate.type) ||
      // Some atomic types have already been ruled out as not quantifiable
      (quantifiedGroup.atomic && !atomicTypes.has(candidate.type)) ||
      quantifiedGroup.flags
    ) {
      return;
    }
    // Make the only child of the group the new `body` of the quantifier
    node.body = candidate as QuantifiableNode;
  },
};

const atomicTypes = new Set<Node['type']>([
  'Assertion',
  'Backreference',
  'Character',
  'CharacterClass',
  'CharacterSet',
  'Directive',
  'NamedCallout',
]);

function hasMultiAltNoncapturingGroupOnlyChild({body}: AlternativeContainerNode): boolean {
  const firstAltEls = body[0].body;
  return (
    body.length === 1 &&
    firstAltEls.length === 1 &&
    firstAltEls[0].type === 'Group' &&
    !firstAltEls[0].atomic &&
    !firstAltEls[0].flags &&
    firstAltEls[0].body.length > 1
  );
}

export {
  unwrapUselessGroups,
};

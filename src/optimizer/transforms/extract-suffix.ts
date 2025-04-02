import {isAlternativeContainer} from '../../parser/node-utils.js';
import {createAlternative, createGroup} from '../../parser/parse.js';
import type {AlternativeContainerNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';
import {isAllowedSimpleType, isNodeEqual} from './extract-prefix.js';

/**
Extract nodes at the end of every alternative into a suffix.
Ex: `aa$|bba$|ca$` -> `(?:a|bb|c)a$`.
Also works within groups.
*/
const extractSuffix: Visitor = {
  '*'(path: Path) {
    const {node} = path as Path<AlternativeContainerNode>;
    if (!isAlternativeContainer(node) || node.alternatives.length < 2) {
      return;
    }
    const firstAltEls = node.alternatives[0].elements;
    const suffixNodes = [];
    let passedSharedSuffix = false;
    let i = 0;
    while (!passedSharedSuffix) {
      const inverseI = firstAltEls.length - 1 - i;
      suffixNodes.push(firstAltEls[inverseI]);
      for (const alt of node.alternatives) {
        const inverseIOfAlt = alt.elements.length - 1 - i;
        const kid = alt.elements[inverseIOfAlt];
        if (!kid || !isAllowedSimpleType(kid.type) || !isNodeEqual(kid, suffixNodes[i])) {
          passedSharedSuffix = true;
          break;
        }
      }
      i++;
    }
    suffixNodes.pop();
    if (
      !suffixNodes.length ||
      // Since this optimization doesn't have a performance benefit (unless it leads to collapsing
      // alternatives in follow-on optimizations, which we do want to enable), avoid applying in
      // cases when it would unnecessarily lengthen the pattern and make it harder to read, e.g.
      // `true|false` -> `(?:tru|fals)e`
      (suffixNodes.length === 1 && node.alternatives.every(alt => alt.elements.length > 2))
    ) {
      return;
    }
    suffixNodes.reverse();

    for (const alt of node.alternatives) {
      alt.elements = alt.elements.slice(0, -suffixNodes.length);
    }
    const newContents = createAlternative();
    const prefixGroup = createGroup();
    prefixGroup.alternatives = node.alternatives;
    if (!prefixGroup.alternatives.every(alt => !alt.elements.length)) {
      newContents.elements.push(prefixGroup);
    }
    newContents.elements.push(...suffixNodes);
    node.alternatives = [newContents];
  },
};

export {
  extractSuffix,
};

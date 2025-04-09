import type {AlternativeContainerNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';
import {isAlternativeContainer} from '../../parser/node-utils.js';
import {createAlternative, createGroup} from '../../parser/parse.js';
import {isAllowedSimpleType, isNodeEqual} from './extract-prefix.js';

/**
Extract nodes at the end of every alternative into a suffix.
Ex: `aa$|bba$|ca$` -> `(?:a|bb|c)a$`.
Also works within groups.
*/
const extractSuffix: Visitor = {
  '*'(path: Path) {
    const {node} = path as Path<AlternativeContainerNode>;
    if (!isAlternativeContainer(node) || node.body.length < 2) {
      return;
    }
    const firstAltEls = node.body[0].body;
    const suffixNodes = [];
    let passedSharedSuffix = false;
    let i = 0;
    while (!passedSharedSuffix) {
      const inverseI = firstAltEls.length - 1 - i;
      suffixNodes.push(firstAltEls[inverseI]);
      for (const alt of node.body) {
        const inverseIOfAlt = alt.body.length - 1 - i;
        const kid = alt.body[inverseIOfAlt];
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
      // Avoid applying in cases when it would lengthen the pattern without any benefit; ex:
      // `true|false` -> `(?:tru|fals)e`
      ( suffixNodes.length === 1 &&
        // Extract a single-node suffix if it's an assertion, since that provides a readability
        // benefit and is more likely to trigger follow-on optimizations
        suffixNodes[0].type !== 'Assertion' &&
        // Four chars are added by the `(?:)` wrapper, so avoid applying if could be net negative
        node.body.length < 4 &&
        // Alts reduced to 0 or 1 node after extracting the suffix can possibly be collapsed in
        // follow-on optimizations, providing a performance and/or minification benefit
        node.body.every(alt => alt.body.length > 2)
      )
    ) {
      return;
    }
    suffixNodes.reverse();

    for (const alt of node.body) {
      alt.body = alt.body.slice(0, -suffixNodes.length);
    }
    const newContentsAlt = createAlternative();
    const prefixGroup = createGroup();
    prefixGroup.body = node.body;
    if (!prefixGroup.body.every(alt => !alt.body.length)) {
      newContentsAlt.body.push(prefixGroup);
    }
    newContentsAlt.body.push(...suffixNodes);
    node.body = [newContentsAlt];
  },
};

export {
  extractSuffix,
};

import type {AlternativeElementNode, AlternativeNode} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';
import {isAlternativeContainer} from '../../parser/node-utils.js';
import {createAlternative, createGroup} from '../../parser/parse.js';
import {isAllowedSimpleType, isNodeEqual} from './extract-prefix.js';

/**
Extract alternating prefixes if patterns are repeated for each prefix.
Ex: `^a|!a|^bb|!bb|^c|!c` -> `(?:^|!)(?:a|bb|c)`.
Also works within groups.
*/
const extractPrefix2: Visitor = {
  '*'({node}) {
    if (!isAlternativeContainer(node)) {
      return;
    }
    const numDiffPrefixes = 2;
    const numAlts = node.body.length;
    if (numAlts < (numDiffPrefixes * 2) || numAlts % numDiffPrefixes) {
      return;
    }
    const prefixAltElsByI = [...node.body.slice(0, numDiffPrefixes).map(alt => alt.body)];
    const prefixNodesByI = Array.from({length: numDiffPrefixes}, (): Array<AlternativeElementNode> => []);
    const prefixIsFinishedByI = Array(numDiffPrefixes).fill(false);
    const longestOf = Math.max(...prefixAltElsByI.map(els => els.length));
    for (let nodeI = 0; nodeI < longestOf; nodeI++) {
      for (let prefixI = 0; prefixI < numDiffPrefixes; prefixI++) {
        if (!prefixIsFinishedByI[prefixI]) {
          const nextNode = prefixAltElsByI[prefixI][nodeI];
          if (
            !nextNode ||
            !isAllowedSimpleType(nextNode.type) ||
            !isPrefixNodeShared(nextNode, node.body, prefixI, nodeI, numDiffPrefixes)
          ) {
            prefixIsFinishedByI[prefixI] = true;
          } else {
            prefixNodesByI[prefixI].push(nextNode);
          }
        }
      }
    }
    if (!prefixNodesByI.some(nodes => nodes.length)) {
      return;
    }
    const strippedAlts = [];
    let counter = 0;
    for (let i = 0; i < numAlts; i++) {
      strippedAlts.push(createAlternative({
        body: node.body[i].body.slice(prefixNodesByI[counter].length),
      }));
      counter = counter < (numDiffPrefixes - 1) ? counter + 1 : 0;
    }
    // Check that each set of alts now use the same value after having had their prefixes removed
    for (let i = 0; i < (numAlts / numDiffPrefixes); i++) {
      const altComparisonSet = strippedAlts.slice(i * numDiffPrefixes, (i * numDiffPrefixes) + numDiffPrefixes);
      for (let j = 1; j < altComparisonSet.length; j++) {
        const els = altComparisonSet[j].body;
        if (els.length !== altComparisonSet[0].body.length) {
          return;
        }
        if (!els.every((el, k) => (
          isAllowedSimpleType(el.type) &&
          isNodeEqual(el, altComparisonSet[0].body[k])
        ))) {
          return;
        }
      }
    }
    const prefixAlts = [];
    for (let i = 0; i < numDiffPrefixes; i++) {
      prefixAlts.push(createAlternative({body: prefixNodesByI[i]}));
    }
    const prefixGroup = createGroup({body: prefixAlts});
    const newContentsAlt = createAlternative({body: [prefixGroup]});
    // Only take one (unique) alt from each set of stripped alts
    const suffixGroup = createGroup({body: strippedAlts.filter((_, i) => i % numDiffPrefixes)});
    if (suffixGroup.body.every(alt => !alt.body.length)) {
      node.body = prefixGroup.body;
    } else {
      newContentsAlt.body.push(suffixGroup);
      node.body = [newContentsAlt];
    }
  },
};

function isPrefixNodeShared(
  node: AlternativeElementNode,
  alts: Array<AlternativeNode>,
  prefixI: number,
  nodeI: number,
  numDiffPrefixes: number
): boolean {
  for (let i = prefixI; i < alts.length; i += numDiffPrefixes) {
    const alt = alts[i];
    const bNode = alt.body[nodeI];
    if (!bNode || !isNodeEqual(bNode, node)) {
      return false;
    }
  }
  return true;
}

export {
  extractPrefix2,
};

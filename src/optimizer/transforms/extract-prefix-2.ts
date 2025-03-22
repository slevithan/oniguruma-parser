import {alternativeContainerTypes} from '../../parser/node-utils.js';
import {createAlternative, createGroup, type AlternativeContainerNode, type AlternativeElementNode, type AlternativeNode} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';
import {isAllowedSimpleType, isNodeEqual} from './extract-prefix.js';

/**
Extract alternating prefixes if patterns are repeated for each prefix.
Also works within groups.
- `^a|!a|^bb|!bb|^c|!c` -> `(?:^|!)(?:a|bb|c)`
*/
const extractPrefix2 = {
  '*'({node}: Path & {node: AlternativeContainerNode;}) {
    if (!alternativeContainerTypes.has(node.type)) {
      return;
    }
    const numDiffPrefixes = 2;
    const numAlts = node.alternatives.length;
    if (numAlts < (numDiffPrefixes * 2) || numAlts % numDiffPrefixes) {
      return;
    }
    const prefixAltElsByI = [...node.alternatives.slice(0, numDiffPrefixes).map(alt => alt.elements)];
    const prefixNodesByI = Array.from({length: numDiffPrefixes}, (): AlternativeElementNode[] => []);
    const prefixIsFinishedByI = Array(numDiffPrefixes).fill(false);
    const longestOf = Math.max(...prefixAltElsByI.map(els => els.length));
    for (let nodeI = 0; nodeI < longestOf; nodeI++) {
      for (let prefixI = 0; prefixI < numDiffPrefixes; prefixI++) {
        if (!prefixIsFinishedByI[prefixI]) {
          const nextNode = prefixAltElsByI[prefixI][nodeI];
          if (
            !nextNode ||
            !isAllowedSimpleType(nextNode.type) ||
            !isPrefixNodeShared(nextNode, node.alternatives, {prefixI, nodeI, numDiffPrefixes})
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
      const alt = createAlternative();
      alt.elements = node.alternatives[i].elements.slice(prefixNodesByI[counter].length);
      strippedAlts.push(alt);
      counter = counter < (numDiffPrefixes - 1) ? counter + 1 : 0;
    }
    // Check that each set of alts now use the same value after having had their prefixes removed
    for (let i = 0; i < (numAlts / numDiffPrefixes); i++) {
      const altComparisonSet = strippedAlts.slice(i * numDiffPrefixes, (i * numDiffPrefixes) + numDiffPrefixes);
      for (let j = 1; j < altComparisonSet.length; j++) {
        const els = altComparisonSet[j].elements;
        if (els.length !== altComparisonSet[0].elements.length) {
          return;
        }
        if (!els.every((el, k) => (
          isAllowedSimpleType(el.type) &&
          isNodeEqual(el, altComparisonSet[0].elements[k])
        ))) {
          return;
        }
      }
    }
    const newContents = createAlternative();
    const prefixGroup = createGroup();
    const prefixAlts = [];
    for (let i = 0; i < numDiffPrefixes; i++) {
      const alt = createAlternative();
      alt.elements = prefixNodesByI[i];
      prefixAlts.push(alt);
    }
    prefixGroup.alternatives = prefixAlts;
    newContents.elements.push(prefixGroup);
    const suffixGroup = createGroup();
    // Only take one (unique) alt from each set of stripped alts
    suffixGroup.alternatives = strippedAlts.filter((_, i) => i % numDiffPrefixes);
    if (suffixGroup.alternatives.every(alt => !alt.elements.length)) {
      node.alternatives = prefixGroup.alternatives;
    } else {
      newContents.elements.push(suffixGroup);
      node.alternatives = [newContents];
    }
  },
};

function isPrefixNodeShared(node: AlternativeElementNode, alts: AlternativeNode[], {prefixI, nodeI, numDiffPrefixes}: {prefixI: number, nodeI: number, numDiffPrefixes: number;}) {
  for (let i = prefixI; i < alts.length; i += numDiffPrefixes) {
    const alt = alts[i];
    const bNode = alt.elements[nodeI];
    if (!bNode || !isNodeEqual(bNode, node)) {
      return false;
    }
  }
  return true;
}

export {
  extractPrefix2,
};

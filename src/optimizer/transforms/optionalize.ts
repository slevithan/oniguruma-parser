import type {AlternativeElementNode} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';
import {isAlternativeContainer, isQuantifiable} from '../../parser/node-utils.js';
import {createQuantifier} from '../../parser/parse.js';
import {throwIfNullish} from '../../utils.js';
import {isAllowedSimpleNode, isNodeEqual} from './extract-prefix.js';

/**
Combine adjacent alternatives with only an added last node as the difference.
*/
const optionalize: Visitor = {
  '*'({node}) {
    if (!isAlternativeContainer(node) || node.body.length < 2) {
      return;
    }
    const {body} = node;
    const newAlts = [body[0]];
    let lastAltKept = body[0];
    for (let i = 1; i < body.length; i++) {
      const alt = body[i];
      const altKids = alt.body;
      const prevAltKids = lastAltKept.body;
      const lengthDiff = Math.abs(altKids.length - prevAltKids.length);
      if (!lengthDiff) {
        if (isNodeArrayEqual(altKids, prevAltKids)) {
          // Don't keep this alt
          continue;
        }
      } else if (lengthDiff === 1) {
        const isPrevAltLonger = !!(prevAltKids.length > altKids.length);
        const altKidsToCompare = isPrevAltLonger ? altKids : altKids.slice(0, -1);
        const prevAltKidsToCompare = isPrevAltLonger ? prevAltKids.slice(0, -1) : prevAltKids;
        if (isNodeArrayEqual(altKidsToCompare, prevAltKidsToCompare)) {
          if (isPrevAltLonger) {
            // If the prev alt has an extra node, put its last node in a greedy `?`
            const prevAltLastKid = throwIfNullish(prevAltKids.at(-1));
            if (isQuantifiableNonQuantifier(prevAltLastKid)) {
              prevAltKids.pop();
              prevAltKids.push(createQuantifier('greedy', 0, 1, prevAltLastKid));
              // Don't keep this alt
              continue;
            }
          } else if (
            // Don't apply if last alt empty since that would lengthen e.g. `(|a|b)` to `(a??|b)`
            prevAltKids.length > 0 ||
            // Unless there are two alts since e.g. `(?:|a)` to `(?:a??)` enables group unwrapping
            body.length === 2
          ) {
            // Since this alt has an extra node compared to prev, add the last node of this alt to
            // the prev, but within a lazy `??`
            const altLastKid = throwIfNullish(altKids.at(-1));
            if (isQuantifiableNonQuantifier(altLastKid)) {
              prevAltKids.push(createQuantifier('lazy', 0, 1, altLastKid));
              // Don't keep this alt
              continue;
            }
          }
        }
      }
      newAlts.push(alt);
      lastAltKept = alt;
    }
    node.body = newAlts;
  },
};

// Returns `false` if the arrays contain a node type it doesn't know how to compare
function isNodeArrayEqual(a: Array<AlternativeElementNode>, b: Array<AlternativeElementNode>) {
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.length; i++) {
    if (!isAllowedSimpleNode(a[i]) || !isAllowedSimpleNode(b[i])) {
      return false;
    }
    if (!isNodeEqual(a[i], b[i])) {
      return false;
    }
  }
  return true;
}

function isQuantifiableNonQuantifier(node: AlternativeElementNode) {
  // Avoid chaining `?` quantifiers since that can come out as `?{0,1}` and be longer than input
  return isQuantifiable(node) && node.type !== 'Quantifier';
}

export {
  optionalize,
};

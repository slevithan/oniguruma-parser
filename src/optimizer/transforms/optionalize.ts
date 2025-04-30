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
      // NOTE: Anytime we `continue` we don't keep this alt
      const alt = body[i];
      const altKids = alt.body;
      const prevAltKids = lastAltKept.body;
      const lengthDiff = Math.abs(altKids.length - prevAltKids.length);
      if (!lengthDiff) {
        if (isNodeArrayEqual(altKids, prevAltKids)) {
          continue;
        }
      } else if (lengthDiff === 1) {
        const isPrevAltLonger = !!(prevAltKids.length > altKids.length);
        const altKidsToCompare = isPrevAltLonger ? altKids : altKids.slice(0, -1);
        const prevAltKidsToCompare = isPrevAltLonger ? prevAltKids.slice(0, -1) : prevAltKids;
        if (isNodeArrayEqual(altKidsToCompare, prevAltKidsToCompare)) {
          if (isPrevAltLonger) {
            const prevAltLastKid = throwIfNullish(prevAltKids.at(-1));
            if (isQuantifiable(prevAltLastKid)) {
              // Avoid chaining quantifiers since e.g. chained greedy `?` is `?{0,1}` and can
              // lengthen the pattern
              if (prevAltLastKid.type === 'Quantifier') {
                if (!prevAltLastKid.min) {
                  continue;
                } else if (prevAltLastKid.min === 1 && prevAltLastKid.kind !== 'lazy') {
                  prevAltLastKid.min = 0;
                  continue;
                }
              } else {
                // Put the prev alt's extra last node in a greedy `?`
                prevAltKids.pop();
                prevAltKids.push(createQuantifier('greedy', 0, 1, prevAltLastKid));
                continue;
              }
            }
          } else if (
            // Don't apply if last alt empty since that would lengthen e.g. `(|a|b)` to `(a??|b)`
            prevAltKids.length > 0 ||
            // Unless there are two alts since e.g. `(?:|a)` to `(?:a??)` enables group unwrapping
            body.length === 2
          ) {
            const altLastKid = throwIfNullish(altKids.at(-1));
            if (isQuantifiable(altLastKid)) {
              if (altLastKid.type === 'Quantifier') {
                if (altLastKid.kind === 'possessive') {
                  // No-op since possessive quantifiers can't also be lazy
                } else if (altLastKid.min <= 1 && altLastKid.kind === 'lazy') {
                  altLastKid.min = 0;
                  prevAltKids.push(altLastKid);
                  continue;
                } else if (!altLastKid.min && altLastKid.max === 1) {
                  altLastKid.kind = 'lazy';
                  prevAltKids.push(altLastKid);
                  continue;
                }
              } else {
                // Put this alt's extra last node in a lazy `??` then add it to the prev alt
                prevAltKids.push(createQuantifier('lazy', 0, 1, altLastKid));
                continue;
              }
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

// Returns `false` if the arrays contain a node type it doesn't know how to compare, or doesn't
// want to compare (e.g. with capturing groups, which can't be removed)
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

export {
  optionalize,
};

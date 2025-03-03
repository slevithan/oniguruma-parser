import {NodeTypes} from '../../parser/parse.js';
import {atomicTypes, quantifiableTypes} from '../../parser/node-types.js';

/**
Unwrap nonbeneficial noncapturing, atomic, and flag groups.
*/
const unwrapUselessGroups = {
  Group({node, parent, replaceWithMultiple}) {
    const {alternatives, atomic, flags} = node;
    if (alternatives.length > 1 || parent.type === NodeTypes.Quantifier) {
      return;
    }
    const els = alternatives[0].elements;
    let unwrap = false;

    if (atomic) {
      if (els.every(({type}) => atomicTypes.has(type))) {
        unwrap = true;
      }
    } else if (flags) {
      // Unwrap if the flags aren't able to change the behavior of the group
      // Flag x (`extended`) has already been applied during parsing
      if (onlyUsesFlagX(flags)) {
        unwrap = true;
      }
    } else {
      unwrap = true;
    }

    if (unwrap) {
      replaceWithMultiple(els, {traverse: true});
    }
  },

  Quantifier({node}) {
    if (node.element.type !== NodeTypes.Group) {
      return;
    }
    const quantifiedGroup = node.element;
    if (quantifiedGroup.alternatives.length > 1) {
      return;
    }
    const groupKids = quantifiedGroup.alternatives[0].elements;
    if (groupKids.length !== 1) {
      return;
    }
    const candidate = groupKids[0];
    if (
      !quantifiableTypes.has(candidate.type) ||
      (quantifiedGroup.atomic && !atomicTypes.has(candidate.type)) ||
      (quantifiedGroup.flags && !onlyUsesFlagX(quantifiedGroup.flags))
    ) {
      return;
    }
    // Make the only child of the group the new element of the quantifier
    node.element = candidate;
  },
};

function onlyUsesFlagX(flagMods) {
  const {enable = {}, disable = {}} = flagMods;
  const keysOmitting = (obj, key) => Object.keys(obj).filter(k => k !== key);
  return !keysOmitting(enable, 'extended').length && !keysOmitting(disable, 'extended').length;
}

export {
  unwrapUselessGroups,
};

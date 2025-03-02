import {AstTypes} from '../../parser/parse.js';

/**
Unwrap nonbeneficial noncapturing, atomic, and flag groups.
*/
const unwrapUselessGroups = {
  Group({node, parent, replaceWithMultiple}) {
    const {alternatives, atomic, flags} = node;
    if (alternatives.length > 1 || parent.type === AstTypes.Quantifier) {
      return;
    }
    const els = alternatives[0].elements;
    let unwrap = false;

    if (atomic) {
      const atomicTypes = new Set([
        AstTypes.Assertion,
        AstTypes.Backreference,
        AstTypes.Character,
        AstTypes.CharacterClass,
        AstTypes.CharacterSet,
        AstTypes.Directive,
      ]);
      if (els.every(({type}) => atomicTypes.has(type))) {
        unwrap = true;
      }
    } else if (flags) {
      // Unwrap if the flags aren't able to change the behavior of the group
      const enable = flags.enable ?? {};
      const disable = flags.disable ?? {};
      const keysOmitting = (obj, key) => Object.keys(obj).filter(k => k !== key);
      // Flag x (`extended`) has already been applied during parsing
      if (!keysOmitting(enable, 'extended').length && !keysOmitting(disable, 'extended').length) {
        unwrap = true;
      }
    } else {
      unwrap = true;
    }

    if (unwrap) {
      replaceWithMultiple(els, {traverse: true});
    }
  },
};

export {
  unwrapUselessGroups,
};

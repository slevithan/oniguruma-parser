import {NodeDirectiveKinds} from '../../parser/parse.js';

/**
Remove flags that have no effect on the given pattern.
[TODO] Support removing additional flags besides `extended`.
*/
const removeUselessFlags = {
  Flags({node}) {
    // Effects of flag x are already applied during parsing
    node.extended = false;
  },

  Directive({node, remove}) {
    if (node.kind !== NodeDirectiveKinds.flags) {
      return;
    }
    removeFlagX(node);
    if (removeEmptyFlagsObj(node)) {
      remove();
    }
  },

  Group({node}) {
    if (!node.flags) {
      return;
    }
    removeFlagX(node);
    removeEmptyFlagsObj(node);
  },
};

function removeEmptyFlagsObj(node) {
  const {flags} = node;
  if (flags && !flags.enable && !flags.disable) {
    delete node.flags;
    return true;
  }
  return false;
}

function removeFlagX({flags}) {
  flags.enable && delete flags.enable.extended;
  flags.disable && delete flags.disable.extended;
  cleanupFlagsObj(flags);
}

function cleanupFlagsObj(flags) {
  flags.enable && !Object.keys(flags.enable).length && delete flags.enable;
  flags.disable && !Object.keys(flags.disable).length && delete flags.disable;
}

export {
  removeUselessFlags,
};

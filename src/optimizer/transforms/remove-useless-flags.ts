import {NodeDirectiveKinds} from '../../parser/parse.js';
import type {DirectiveNode, FlagGroupModifiers, FlagsNode, GroupNode} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';

/**
Remove flags (from top-level and modifiers) that have no effect.
[TODO] Support removing additional flags besides `x`.
*/
const removeUselessFlags = {
  Flags({node}: Path & {node: FlagsNode}) {
    // Effects of flag x are already applied during parsing
    node.extended = false;
  },

  Directive({node, remove}: Path & {node: DirectiveNode}) {
    if (node.kind !== NodeDirectiveKinds.flags) {
      return;
    }
    removeFlagX(node);
    if (removeEmptyFlagsObj(node)) {
      remove();
    }
  },

  Group({node}: Path & {node: GroupNode}) {
    if (!node.flags) {
      return;
    }
    removeFlagX(node);
    removeEmptyFlagsObj(node);
  },
};

function removeEmptyFlagsObj(node: DirectiveNode | GroupNode) {
  const {flags} = node;
  if (flags && !flags.enable && !flags.disable) {
    delete node.flags;
    return true;
  }
  return false;
}

function removeFlagX({flags}: DirectiveNode | GroupNode) {
  flags?.enable && delete flags.enable.extended;
  flags?.disable && delete flags.disable.extended;
  cleanupFlagsObj(flags);
}

function cleanupFlagsObj(flags: FlagGroupModifiers | undefined) {
  flags?.enable && !Object.keys(flags.enable).length && delete flags.enable;
  flags?.disable && !Object.keys(flags.disable).length && delete flags.disable;
}

export {
  removeUselessFlags,
};

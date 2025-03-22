import {NodeDirectiveKinds, type DirectiveNode, type FlagGroupModifiers, type GroupNode, type Node} from '../../parser/parse.js';
import type {RegexFlags} from '../../tokenizer/tokenize.js';
import type {Path} from '../../traverser/traverse.js';

/**
Remove flags (from top-level and modifiers) that have no effect.
[TODO] Support removing additional flags besides `x`.
*/
const removeUselessFlags = {
  Flags({node}: Path & {node: RegexFlags & FlagGroupModifiers;}) {
    // Effects of flag x are already applied during parsing
    node.extended = false;
  },

  Directive({node, remove}: Path & {node: DirectiveNode;}) {
    if (node.kind !== NodeDirectiveKinds.flags) {
      return;
    }
    removeFlagX(node);
    if (removeEmptyFlagsObj(node)) {
      remove();
    }
  },

  Group({node}: Path & {node: DirectiveNode;}) {
    if (!node.flags) {
      return;
    }
    removeFlagX(node);
    removeEmptyFlagsObj(node);
  },
};

function removeEmptyFlagsObj(node: DirectiveNode) {
  const {flags} = node;
  if (flags && !flags.enable && !flags.disable) {
    delete node.flags;
    return true;
  }
  return false;
}

function removeFlagX({flags}: DirectiveNode) {
  flags.enable && delete flags.enable.extended;
  flags.disable && delete flags.disable.extended;
  cleanupFlagsObj(flags);
}

function cleanupFlagsObj(flags: FlagGroupModifiers) {
  flags.enable && !Object.keys(flags.enable).length && delete flags.enable;
  flags.disable && !Object.keys(flags.disable).length && delete flags.disable;
}

export {
  removeUselessFlags,
};

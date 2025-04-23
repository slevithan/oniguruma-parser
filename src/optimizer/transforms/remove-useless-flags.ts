import type {DirectiveNode, GroupNode} from '../../parser/parse.js';
import type {FlagGroupModifiers} from '../../tokenizer/tokenize.js';
import type {Visitor} from '../../traverser/traverse.js';

/**
Remove flags (from top-level and modifiers) that have no effect.
*/
const removeUselessFlags: Visitor = {
  // TODO: Support removing additional flags

  Flags({node}) {
    // Effects of flag x are already applied during parsing
    node.extended = false;
    // Grapheme mode is the default
    if (node.textSegmentMode === 'grapheme') {
      node.textSegmentMode = null;
    }
  },

  Directive({node, remove}) {
    if (node.kind !== 'flags') {
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

function removeEmptyFlagsObj(node: DirectiveNode | GroupNode): boolean {
  const {flags} = node;
  if (flags && !flags.enable && !flags.disable) {
    delete node.flags;
    return true;
  }
  return false;
}

function removeFlagX({flags}: DirectiveNode | GroupNode) {
  if (!flags) {
    throw new Error('Expected flags');
  }
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

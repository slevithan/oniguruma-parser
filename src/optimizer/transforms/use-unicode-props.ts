import type {CharacterSetNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';
import {createUnicodeProperty} from '../../parser/parse.js';
import {isRange} from './use-shorthands.js';

/**
Use Unicode properties when possible.
- `\p{Any}` from `[\0-\x{10FFFF}]`
- `\p{Cc}` from POSIX `\p{cntrl}`, `[[:cntrl:]]`
See also `useShorthands`.
*/
const useUnicodeProps: Visitor = {
  CharacterSet({node, root, replaceWith}: Path) {
    const {kind, negate, value} = node as CharacterSetNode;
    let newNode;
    if (
      kind === 'posix' &&
      value === 'cntrl' &&
      // TODO: Also check local context, after the parser supports this flag on mode modifiers
      !root.flags.posixIsAscii
    ) {
      newNode = createUnicodeProperty('Cc', {negate});
    }

    if (newNode) {
      replaceWith(newNode);
    }
  },

  CharacterClassRange({node, replaceWith}: Path) {
    if (isRange(node, 0, 0x10FFFF)) {
      replaceWith(createUnicodeProperty('Any'));
    }
  },
};

export {
  useUnicodeProps,
};

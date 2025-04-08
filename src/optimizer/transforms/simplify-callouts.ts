import type {NamedCalloutNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';
import {createLookaroundAssertion} from '../../parser/parse.js';

/**
Cleanup callout arguments, removing redundant commas, leading zeros, and empty braces.
*/
const simplifyCallouts: Visitor = {
  NamedCallout(path: Path) {
    const {node, replaceWith} = path as Path<NamedCalloutNode>;
    const {arguments: args, kind} = node;

    // Special case: `(*FAIL)` -> `(?!)`
    if (kind === 'fail') {
      replaceWith(createLookaroundAssertion({negate: true}));
      return;
    }

    if (!args) {
      return;
    }
    const newArgs: Array<string | number> = args.
      filter(arg => arg !== '').
      // TODO: If supporting custom callout names in the future, add `kind !== 'custom'` to this
      // condition, since custom named callouts might treat e.g. `+05` as a string
      map(arg => (typeof arg === 'string' && /^[+-]?\d+$/.test(arg)) ? +arg : arg);
    node.arguments = newArgs.length ? newArgs : null;
  },
};

export {
  simplifyCallouts,
};

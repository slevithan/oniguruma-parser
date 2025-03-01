import {AstTypes} from '../../parser/index.js';

/**
Remove unnecessary nested groups.

TODO: Currently this is very basic and only unwraps directly nested groups; not outermost groups.
This should be rewritten to unwrap group contents directly, if the group isn't needed:
- Unwrap noncapturing groups if no alternatives and not quantified.
- Unwrap atomic groups if no alternatives, not quantified, and contents include only certain node types.
- Unwrap flag groups if no alternatives, not quantified, and contents can't be affected by the flags.
*/
const transform = {
  Group({node, replaceWith}) {
    const {alternatives, atomic, flags} = node;
    const firstAltEls = alternatives[0].elements;
    if (
      alternatives.length === 1 &&
      firstAltEls.length === 1 &&
      firstAltEls[0].type === AstTypes.Group &&
      !(atomic && firstAltEls[0].flags) &&
      !(flags && (firstAltEls[0].atomic || firstAltEls[0].flags))
    ) {
      if (atomic) {
        firstAltEls[0].atomic = true;
      } else if (flags) {
        firstAltEls[0].flags = flags;
      }
      replaceWith(firstAltEls[0]);
    }
  },
};

export default transform;

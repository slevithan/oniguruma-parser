import {AstTypes} from '../../parser/index.js';

/**
Remove empty noncapturing, atomic, and flag groups, plus any attached quantifiers.
- `(?:)a` -> `a`
- `(?:)+a` -> `a`
- `(?:)+*a` -> `a`
- `(?>)a` -> `a`
- `(?i-m:)a` -> `a`
- `(?:(?>))a` -> `a`
*/
const transform = {
  Group({node, remove, skip}) {
    if (isEmptyGroupOrContainsOnlyEmptyGroups(node)) {
      remove();
      skip();
    }
  },

  Quantifier({node, remove, skip}) {
    let kid = node.element;
    while (kid.type === AstTypes.Quantifier) {
      kid = kid.element;
    }
    if (isEmptyGroupOrContainsOnlyEmptyGroups(kid)) {
      remove();
      skip();
    }
  },
};

function isEmptyGroup(node) {
  return (
    node.type === AstTypes.Group &&
    node.alternatives.length === 1 &&
    node.alternatives[0].elements.length === 0
  );
}

function isEmptyGroupOrContainsOnlyEmptyGroups(node) {
  while (
    node.type === AstTypes.Group &&
    node.alternatives.length === 1 &&
    node.alternatives[0].elements.length === 1
  ) {
    node = node.alternatives[0].elements[0];
  }
  return isEmptyGroup(node);
}

export default transform;

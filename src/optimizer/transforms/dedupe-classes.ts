import {NodeCharacterClassKinds, NodeTypes, type CharacterClassElementNode, type CharacterClassNode} from '../../parser/parse.js';
import type {Path} from '../../traverser/traverse.js';

/**
Remove duplicate characters, sets, and ranges from character classes.
*/
const dedupeClasses = {
  CharacterClass({node}: Path & {node: typeof NodeCharacterClassKinds & CharacterClassNode;}) {
    const {kind, elements} = node;
    if (kind !== NodeCharacterClassKinds.union) {
      return;
    }
    const keep: CharacterClassElementNode[] = [];
    for (const el of elements) {
      // Preserve the order; ignore formatting differences
      if (
        ( el.type === NodeTypes.Character &&
          keep.some(k => (
            k.type === el.type &&
            k.value === el.value
          ))
        ) ||
        ( el.type === NodeTypes.CharacterSet &&
          keep.some(k => (
            k.type === el.type &&
            k.kind === el.kind &&
            k.negate === el.negate &&
            k.value === el.value
          ))
        ) ||
        ( el.type === NodeTypes.CharacterClassRange &&
          keep.some(k => (
            k.type === el.type &&
            k.min.value === el.min.value &&
            k.max.value === el.max.value
          ))
        )
      ) {
        continue;
      }
      // Keep non-duplicate nodes (first instance) and any `CharacterClass` nodes
      keep.push(el);
    }
    node.elements = keep;
  },
};

export {
  dedupeClasses,
};

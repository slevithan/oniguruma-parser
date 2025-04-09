import type {CharacterClassElementNode, CharacterClassNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

/**
Remove duplicate characters, sets, and ranges from character classes.
*/
const dedupeClasses: Visitor = {
  CharacterClass(path: Path) {
    const {node} = path as Path<CharacterClassNode>;
    const {body, kind} = node;
    if (kind !== 'union') {
      return;
    }
    const keep: Array<CharacterClassElementNode> = [];
    for (const el of body) {
      // Preserve the order; ignore formatting differences
      if (
        ( el.type === 'Character' &&
          keep.some(k => (
            k.type === el.type &&
            k.value === el.value
          ))
        ) ||
        ( el.type === 'CharacterSet' &&
          keep.some(k => (
            k.type === el.type &&
            k.kind === el.kind &&
            k.negate === el.negate &&
            k.value === el.value
          ))
        ) ||
        ( el.type === 'CharacterClassRange' &&
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
    node.body = keep;
  },
};

export {
  dedupeClasses,
};

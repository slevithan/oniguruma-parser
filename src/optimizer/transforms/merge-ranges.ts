import type {CharacterClassElementNode, CharacterClassRangeNode, CharacterNode} from '../../parser/parse.js';
import type {Visitor} from '../../traverser/traverse.js';
import {createCharacter, createCharacterClassRange} from '../../parser/parse.js';

/**
Merge, dedupe, and sort ranges and characters in character classes.
*/
const mergeRanges: Visitor = {
  CharacterClass({node}) {
    if (node.kind !== 'union' || !node.body.length) {
      return;
    }

    // ## Since characters and ranges will be deduped by merging, might as well dedupe sets too
    const withoutDupeSets: Array<CharacterClassElementNode> = [];
    for (const el of node.body) {
      if (
        el.type === 'CharacterSet' &&
        withoutDupeSets.some(k => (
          k.type === el.type &&
          k.kind === el.kind &&
          k.negate === el.negate &&
          k.value === el.value
        ))
      ) {
        continue;
      }
      // Keep non-duplicate sets (first instance) and any non-set nodes
      withoutDupeSets.push(el);
    }
    node.body = withoutDupeSets;

    // ## Now merge characters and ranges
    const keep: Array<Exclude<CharacterClassElementNode, HandledNode>> = [];
    const candidates: Array<HandledNode> = [];
    for (const el of node.body) {
      if (el.type === 'Character' || el.type === 'CharacterClassRange') {
        candidates.push(el);
      } else {
        keep.push(el);
      }
    }
    if (!candidates.length) {
      return;
    }
    candidates.sort((a, b) => {
      const aValue = a.type === 'Character' ? a.value : a.min.value;
      const bValue = b.type === 'Character' ? b.value : b.min.value;
      return aValue - bValue;
    });
    const merged: Array<HandledNode> = [candidates[0]];
    for (let i = 1; i < candidates.length; i++) {
      const el = candidates[i];
      const last = merged.at(-1)!;
      const elMin = el.type === 'Character' ? el.value : el.min.value;
      const lastMax = last.type === 'Character' ? last.value : last.max.value;
      if (elMin <= lastMax + 1) {
        if (last.type === 'Character' && el.type === 'Character') {
          if (last.value !== el.value) {
            merged[merged.length - 1] = createCharacterClassRange(last, el);
          }
        } else if (last.type === 'Character' && el.type === 'CharacterClassRange') {
          merged[merged.length - 1] = createCharacterClassRange(createCharacter(last.value), el.max);
        } else if (last.type === 'CharacterClassRange' && el.type === 'Character') {
          last.max.value = Math.max(el.value, last.max.value);
        } else if (last.type === 'CharacterClassRange' && el.type === 'CharacterClassRange') {
          last.max.value = Math.max(el.max.value, last.max.value);
        } else {
          throw new Error('Unexpected merge case');
        }
      } else {
        merged.push(el);
      }
    }
    // Replace any ranges with fewer than four (sometimes three) chars with character nodes
    const final = merged.flatMap(el => {
      if (el.type === 'CharacterClassRange') {
        const diff = el.max.value - el.min.value;
        // More aggressively use ranges for U+40000+, since they're rendered in long form like
        // `\x{40000}` rather than as single-length characters
        if (el.min.value > 0x3FFFF && diff > 1) {
          return el;
        } else if (!diff) {
          return el.min;
        } else if (diff === 1) {
          return [el.min, el.max];
        } else if (diff === 2) {
          // Ex: `a-c` -> `abc`
          return [el.min, createCharacter(el.min.value + 1), el.max];
        }
        // `diff > 2`
      }
      return el;
    });
    // Always replace `body` to avoid skipping things like `[a-a]` -> `[a]` where both classes
    // contain the same number of nodes; means we always sort characters/ranges by their values
    node.body = [
      // Pull chars to the front that don't need to be escaped in first position
      ...final.filter(el => firstPosChar(el)),
      ...final.filter(el => !firstPosChar(el)),
      ...keep
    ];
  },
};

type HandledNode = CharacterNode | CharacterClassRangeNode;

function firstPosChar(node: HandledNode): boolean {
  // Is `-` or `]`
  return node.type === 'Character' && (node.value === 45 || node.value === 93);
}

export {
  mergeRanges,
};

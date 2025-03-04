import {alternationToClass} from './transforms/alternation-to-class.js';
import {dedupeClasses} from './transforms/dedupe-classes.js';
import {extractPrefix} from './transforms/extract-prefix.js';
import {extractPrefix2} from './transforms/extract-prefix-2.js';
import {removeEmptyGroups} from './transforms/remove-empty-groups.js';
import {unnestOnlyChildClasses} from './transforms/unnest-only-child-classes.js';
import {unnestUselessClasses} from './transforms/unnest-useless-classes.js';
import {unwrapUselessClasses} from './transforms/unwrap-useless-classes.js';
import {unwrapUselessGroups} from './transforms/unwrap-useless-groups.js';
import {useShorthands} from './transforms/use-shorthands.js';
import {useUnicodeAliases} from './transforms/use-unicode-aliases.js';

/**
@typedef {
  'alternationToClass' |
  'dedupeClasses' |
  'extractPrefix' |
  'extractPrefix2' |
  'removeEmptyGroups' |
  'unnestOnlyChildClasses' |
  'unnestUselessClasses' |
  'unwrapUselessClasses' |
  'unwrapUselessGroups' |
  'useShorthands' |
  'useUnicodeAliases'
} OptimizationName
*/
const optimizations = new Map([
  ['alternationToClass', alternationToClass],
  ['dedupeClasses', dedupeClasses],
  ['extractPrefix', extractPrefix],
  ['extractPrefix2', extractPrefix2],
  ['removeEmptyGroups', removeEmptyGroups],
  ['unnestOnlyChildClasses', unnestOnlyChildClasses],
  ['unnestUselessClasses', unnestUselessClasses],
  ['unwrapUselessClasses', unwrapUselessClasses],
  ['unwrapUselessGroups', unwrapUselessGroups],
  ['useShorthands', useShorthands],
  ['useUnicodeAliases', useUnicodeAliases],
]);

export {
  optimizations,
};

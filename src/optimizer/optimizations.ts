import {alternationToClass} from './transforms/alternation-to-class.js';
import {dedupeClasses} from './transforms/dedupe-classes.js';
import {extractPrefix} from './transforms/extract-prefix.js';
import {extractPrefix2} from './transforms/extract-prefix-2.js';
import {preventReDoS} from './transforms/prevent-redos.js';
import {removeEmptyGroups} from './transforms/remove-empty-groups.js';
import {removeUselessFlags} from './transforms/remove-useless-flags.js';
import {unnestUselessClasses} from './transforms/unnest-useless-classes.js';
import {unwrapNegationWrappers} from './transforms/unwrap-negation-wrappers.js';
import {unwrapUselessClasses} from './transforms/unwrap-useless-classes.js';
import {unwrapUselessGroups} from './transforms/unwrap-useless-groups.js';
import {useShorthands} from './transforms/use-shorthands.js';
import {useUnicodeAliases} from './transforms/use-unicode-aliases.js';
import {useUnicodeProps} from './transforms/use-unicode-props.js';

/**
@typedef {
  'alternationToClass' |
  'dedupeClasses' |
  'extractPrefix' |
  'extractPrefix2' |
  'preventReDoS' |
  'removeEmptyGroups' |
  'removeUselessFlags' |
  'unnestUselessClasses' |
  'unwrapNegationWrappers' |
  'unwrapUselessClasses' |
  'unwrapUselessGroups' |
  'useShorthands' |
  'useUnicodeAliases' |
  'useUnicodeProps'
} OptimizationName
*/
const optimizations = new Map([
  ['alternationToClass', alternationToClass],
  ['dedupeClasses', dedupeClasses],
  ['extractPrefix', extractPrefix],
  ['extractPrefix2', extractPrefix2],
  ['preventReDoS', preventReDoS],
  ['removeEmptyGroups', removeEmptyGroups],
  ['removeUselessFlags', removeUselessFlags],
  ['unnestUselessClasses', unnestUselessClasses],
  ['unwrapNegationWrappers', unwrapNegationWrappers],
  ['unwrapUselessClasses', unwrapUselessClasses],
  ['unwrapUselessGroups', unwrapUselessGroups],
  ['useShorthands', useShorthands],
  ['useUnicodeAliases', useUnicodeAliases],
  ['useUnicodeProps', useUnicodeProps],
]);

export {
  optimizations,
};

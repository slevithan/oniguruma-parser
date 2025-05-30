import type {Visitor} from '../traverser/traverse.js';
import {alternationToClass} from './transforms/alternation-to-class.js';
import {exposeAnchors} from './transforms/expose-anchors.js';
import {extractPrefix} from './transforms/extract-prefix.js';
import {extractPrefix2} from './transforms/extract-prefix-2.js';
import {extractSuffix} from './transforms/extract-suffix.js';
import {mergeRanges} from './transforms/merge-ranges.js';
import {optionalize} from './transforms/optionalize.js';
import {preventReDoS} from './transforms/prevent-redos.js';
import {removeEmptyGroups} from './transforms/remove-empty-groups.js';
import {removeUselessFlags} from './transforms/remove-useless-flags.js';
import {simplifyCallouts} from './transforms/simplify-callouts.js';
import {unnestUselessClasses} from './transforms/unnest-useless-classes.js';
import {unwrapNegationWrappers} from './transforms/unwrap-negation-wrappers.js';
import {unwrapUselessClasses} from './transforms/unwrap-useless-classes.js';
import {unwrapUselessGroups} from './transforms/unwrap-useless-groups.js';
import {useShorthands} from './transforms/use-shorthands.js';
import {useUnicodeAliases} from './transforms/use-unicode-aliases.js';
import {useUnicodeProps} from './transforms/use-unicode-props.js';

type OptimizationName =
  'alternationToClass' |
  'exposeAnchors' |
  'extractPrefix' |
  'extractPrefix2' |
  'extractSuffix' |
  'mergeRanges' |
  'optionalize' |
  'preventReDoS' |
  'removeEmptyGroups' |
  'removeUselessFlags' |
  'simplifyCallouts' |
  'unnestUselessClasses' |
  'unwrapNegationWrappers' |
  'unwrapUselessClasses' |
  'unwrapUselessGroups' |
  'useShorthands' |
  'useUnicodeAliases' |
  'useUnicodeProps';

const optimizations = new Map<OptimizationName, Visitor>([
  ['alternationToClass', alternationToClass],
  ['exposeAnchors', exposeAnchors],
  ['extractPrefix', extractPrefix],
  ['extractPrefix2', extractPrefix2],
  ['extractSuffix', extractSuffix],
  ['optionalize', optionalize],
  ['preventReDoS', preventReDoS],
  ['removeEmptyGroups', removeEmptyGroups],
  ['removeUselessFlags', removeUselessFlags],
  ['simplifyCallouts', simplifyCallouts],
  ['unnestUselessClasses', unnestUselessClasses],
  ['unwrapNegationWrappers', unwrapNegationWrappers],
  ['unwrapUselessClasses', unwrapUselessClasses],
  ['unwrapUselessGroups', unwrapUselessGroups],
  ['useShorthands', useShorthands],
  ['useUnicodeAliases', useUnicodeAliases],
  ['useUnicodeProps', useUnicodeProps],
  // Run last to let shorthands, etc. be found from ranges first
  ['mergeRanges', mergeRanges],
]);

export {
  type OptimizationName,
  optimizations,
};

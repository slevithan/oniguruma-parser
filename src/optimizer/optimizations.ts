import type {Visitor} from '../traverser/traverse.js';
import {alternationToClass} from './transforms/alternation-to-class.js';
import {dedupeClasses} from './transforms/dedupe-classes.js';
import {exposeAnchors} from './transforms/expose-anchors.js';
import {extractPrefix} from './transforms/extract-prefix.js';
import {extractPrefix2} from './transforms/extract-prefix-2.js';
import {extractSuffix} from './transforms/extract-suffix.js';
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
  'dedupeClasses' |
  'exposeAnchors' |
  'extractPrefix' |
  'extractPrefix2' |
  'extractSuffix' |
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
  ['dedupeClasses', dedupeClasses],
  ['exposeAnchors', exposeAnchors],
  ['extractPrefix', extractPrefix],
  ['extractPrefix2', extractPrefix2],
  ['extractSuffix', extractSuffix],
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
]);

export {
  type OptimizationName,
  optimizations,
};

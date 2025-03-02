import {removeEmptyGroups} from './transforms/remove-empty-groups.js';
import {unnestOnlyChildClasses} from './transforms/unnest-only-child-classes.js';
import {unwrapUselessClasses} from './transforms/unwrap-useless-classes.js';
import {unwrapUselessGroups} from './transforms/unwrap-useless-groups.js';

/**
@typedef {
  'removeEmptyGroups' |
  'unnestOnlyChildClasses' |
  'unwrapUselessClasses' |
  'unwrapUselessGroups'
} OptimizationName
*/
const optimizations = new Map([
  ['removeEmptyGroups', removeEmptyGroups],
  ['unnestOnlyChildClasses', unnestOnlyChildClasses],
  ['unwrapUselessClasses', unwrapUselessClasses],
  ['unwrapUselessGroups', unwrapUselessGroups],
]);

export {
  optimizations,
};

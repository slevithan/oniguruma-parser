import {removeEmptyGroups} from './transforms/remove-empty-groups.js';
import {unnestOnlyChildClasses} from './transforms/unnest-only-child-classes.js';
import {unnestUselessClasses} from './transforms/unnest-useless-classes.js';
import {unwrapUselessClasses} from './transforms/unwrap-useless-classes.js';
import {unwrapUselessGroups} from './transforms/unwrap-useless-groups.js';

/**
@typedef {
  'removeEmptyGroups' |
  'unnestOnlyChildClasses' |
  'unnestUselessClasses' |
  'unwrapUselessClasses' |
  'unwrapUselessGroups'
} OptimizationName
*/
const optimizations = new Map([
  ['removeEmptyGroups', removeEmptyGroups],
  ['unnestOnlyChildClasses', unnestOnlyChildClasses],
  ['unnestUselessClasses', unnestUselessClasses],
  ['unwrapUselessClasses', unwrapUselessClasses],
  ['unwrapUselessGroups', unwrapUselessGroups],
]);

export {
  optimizations,
};

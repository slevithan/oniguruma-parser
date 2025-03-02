import removeEmptyGroups from './transforms/remove-empty-groups.js';
import unnestOnlyChildClasses from './transforms/unnest-only-child-classes.js';
import unwrapClasses from './transforms/unwrap-classes.js';
import unwrapGroups from './transforms/unwrap-groups.js';

/**
@typedef {
  'removeEmptyGroups' |
  'unnestOnlyChildClasses' |
  'unwrapClasses' |
  'unwrapGroups'
} OptimizationName
*/
const optimizations = new Map([
  ['removeEmptyGroups', removeEmptyGroups],
  ['unnestOnlyChildClasses', unnestOnlyChildClasses],
  ['unwrapClasses', unwrapClasses],
  ['unwrapGroups', unwrapGroups],
]);

export {
  optimizations,
};

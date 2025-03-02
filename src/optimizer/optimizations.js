import removeEmptyGroups from './transforms/remove-empty-groups.js';
import unwrapClasses from './transforms/unwrap-classes.js';
import unwrapGroups from './transforms/unwrap-groups.js';

/**
@typedef {
  'removeEmptyGroups' |
  'unwrapClasses' |
  'unwrapGroups'
} OptimizationName
*/
const optimizations = new Map([
  ['removeEmptyGroups', removeEmptyGroups],
  ['unwrapClasses', unwrapClasses],
  ['unwrapGroups', unwrapGroups],
]);

export {
  optimizations,
};

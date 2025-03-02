import removeEmptyGroups from './transforms/remove-empty-groups.js';
import unclass from './transforms/unclass.js';
import ungroup from './transforms/ungroup.js';

/**
@typedef {
  'removeEmptyGroups' |
  'unclass' |
  'ungroup'
} OptimizationName
*/
const optimizations = new Map([
  ['removeEmptyGroups', removeEmptyGroups],
  ['unclass', unclass],
  ['ungroup', ungroup],
]);

export {
  optimizations,
};

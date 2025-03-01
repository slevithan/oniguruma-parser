import removeEmptyGroups from './transforms/remove-empty-groups.js';
import ungroup from './transforms/ungroup.js';

/**
@typedef {
  'removeEmptyGroups' |
  'ungroup'
} OptimizationName
*/
const transforms = new Map([
  ['removeEmptyGroups', removeEmptyGroups],
  ['ungroup', ungroup],
]);

export {
  transforms,
};

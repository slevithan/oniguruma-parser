import removeEmptyGroups from './transforms/remove-empty-groups.js';

/**
@typedef {
  'removeEmptyGroups'
} OptimizationName
*/

const transforms = new Map([
  ['removeEmptyGroups', removeEmptyGroups],
]);

export {
  transforms,
};

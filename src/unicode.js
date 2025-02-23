const PosixClassNames = new Set([
  'alnum',
  'alpha',
  'ascii',
  'blank',
  'cntrl',
  'digit',
  'graph',
  'lower',
  'print',
  'punct',
  'space',
  'upper',
  'word',
  'xdigit',
]);

// Generates a Unicode property lookup name: lowercase, without spaces, hyphens, underscores
function slug(name) {
  return name.replace(/[- _]+/g, '').toLowerCase();
}

export {
  PosixClassNames,
  slug,
};

const cp = String.fromCodePoint;
const r = String.raw;

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

function getOrInsert(map, key, defaultValue) {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }
  return map.get(key);
}

function throwIfNot(value, msg) {
  if (!value) {
    throw new Error(msg ?? 'Value expected');
  }
  return value;
}

export {
  cp,
  getOrInsert,
  PosixClassNames,
  r,
  throwIfNot,
};

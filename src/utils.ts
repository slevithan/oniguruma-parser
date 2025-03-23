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

function getOrInsert<T extends any>(map: Map<any, T>, key: any, defaultValue: any): T {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }
  return map.get(key);
}

function throwIfNot<T extends any>(value: T, msg?: string): T {
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

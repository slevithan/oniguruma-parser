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

function getOrInsert<Key extends any, Value extends any>(map: Map<Key, Value>, key: Key, defaultValue: Value): Value {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }
  return map.get(key)!;
}

function throwIfNot<Value extends any>(value: Value, msg?: string): Value {
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

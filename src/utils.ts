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

function getOrInsert<Key, Value>(map: Map<Key, Value>, key: Key, defaultValue: Value): Value {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }
  return map.get(key)!;
}

// TODO: Rename as `throwIfNullable`
function throwIfNot<Value>(value: Value, msg?: string): NonNullable<Value> {
  if (value == null) {
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

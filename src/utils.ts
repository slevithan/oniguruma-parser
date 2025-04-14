function cpOf(char: string): number {
  // Count code point length
  if ([...char].length !== 1) {
    throw new Error(`Expected "${char}" to be a single code point`);
  }
  return char.codePointAt(0)!;
}

function getOrInsert<Key, Value>(map: Map<Key, Value>, key: Key, defaultValue: Value): Value {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }
  return map.get(key)!;
}

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

const r = String.raw;

function throwIfNullish<Value>(value: Value, msg?: string): NonNullable<Value> {
  if (value == null) {
    throw new Error(msg ?? 'Value expected');
  }
  return value;
}

export {
  cpOf,
  getOrInsert,
  PosixClassNames,
  r,
  throwIfNullish,
};

const r = String.raw;

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
  getOrInsert,
  r,
  throwIfNot,
};

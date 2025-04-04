import type {TokenNamedCalloutKind} from "./tokenizer/tokenize.js";

const cp = String.fromCodePoint;
const r = String.raw;

const CalloutNames = new Set<Uppercase<Exclude<TokenNamedCalloutKind, 'unknown'>>>([
  'COUNT',
  'CMP',
  'ERROR',
  'FAIL',
  'MAX',
  'MISMATCH',
  'SKIP',
  'TOTAL_COUNT',
]);

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

function throwIfNullable<Value>(value: Value, msg?: string): NonNullable<Value> {
  if (value == null) {
    throw new Error(msg ?? 'Value expected');
  }
  return value;
}

export {
  CalloutNames,
  cp,
  getOrInsert,
  PosixClassNames,
  r,
  throwIfNullable,
};

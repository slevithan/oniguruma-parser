import type {TokenNamedCalloutKind} from "./tokenizer/tokenize.js";

const CalloutNames = new Set<Uppercase<Exclude<TokenNamedCalloutKind, 'custom'>>>([
  'COUNT',
  'CMP',
  'ERROR',
  'FAIL',
  'MAX',
  'MISMATCH',
  'SKIP',
  'TOTAL_COUNT',
]);

function cpOf(char: string): number {
  // Code point length
  if ([...char].length !== 1) {
    throw new Error(`Expected single code point "${char}"`);
  }
  return char.codePointAt(0)!;
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

function getOrInsert<Key, Value>(map: Map<Key, Value>, key: Key, defaultValue: Value): Value {
  if (!map.has(key)) {
    map.set(key, defaultValue);
  }
  return map.get(key)!;
}

const r = String.raw;

function throwIfNullable<Value>(value: Value, msg?: string): NonNullable<Value> {
  if (value == null) {
    throw new Error(msg ?? 'Value expected');
  }
  return value;
}

export {
  CalloutNames,
  cpOf,
  getOrInsert,
  PosixClassNames,
  r,
  throwIfNullable,
};

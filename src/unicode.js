import {r} from './utils.js';

// The following set includes:
// - All ES2024 general categories and their aliases (all are supported by Oniguruma). See
//   <github.com/mathiasbynens/unicode-match-property-value-ecmascript/blob/main/data/mappings.js>
// - All ES2024 binary properties and their aliases (all are supported by Oniguruma). See
//   <tc39.es/ecma262/multipage/text-processing.html#table-binary-unicode-properties>
// Unicode properties must be mapped to property names supported by JS, and must also apply JS's
// stricter rules for casing, whitespace, and underscores in Unicode property names. In order to
// remain lightweight, this library assumes properties not in this list are Unicode script names
// (which require a `Script=` or `sc=` prefix in JS). Unlike JS, Oniguruma doesn't support script
// extensions, and it supports some properties that aren't supported in JS (including blocks with
// an `In_` prefix). See also:
// - Properties supported in Oniguruma: <github.com/kkos/oniguruma/blob/master/doc/UNICODE_PROPERTIES>
// - Properties supported in JS by spec version: <github.com/eslint-community/regexpp/blob/main/src/unicode/properties.ts>
const JsUnicodeProperties = new Set(
`C Other
Cc Control cntrl
Cf Format
Cn Unassigned
Co Private_Use
Cs Surrogate
L Letter
LC Cased_Letter
Ll Lowercase_Letter
Lm Modifier_Letter
Lo Other_Letter
Lt Titlecase_Letter
Lu Uppercase_Letter
M Mark Combining_Mark
Mc Spacing_Mark
Me Enclosing_Mark
Mn Nonspacing_Mark
N Number
Nd Decimal_Number digit
Nl Letter_Number
No Other_Number
P Punctuation punct
Pc Connector_Punctuation
Pd Dash_Punctuation
Pe Close_Punctuation
Pf Final_Punctuation
Pi Initial_Punctuation
Po Other_Punctuation
Ps Open_Punctuation
S Symbol
Sc Currency_Symbol
Sk Modifier_Symbol
Sm Math_Symbol
So Other_Symbol
Z Separator
Zl Line_Separator
Zp Paragraph_Separator
Zs Space_Separator
ASCII
ASCII_Hex_Digit AHex
Alphabetic Alpha
Any
Assigned
Bidi_Control Bidi_C
Bidi_Mirrored Bidi_M
Case_Ignorable CI
Cased
Changes_When_Casefolded CWCF
Changes_When_Casemapped CWCM
Changes_When_Lowercased CWL
Changes_When_NFKC_Casefolded CWKCF
Changes_When_Titlecased CWT
Changes_When_Uppercased CWU
Dash
Default_Ignorable_Code_Point DI
Deprecated Dep
Diacritic Dia
Emoji
Emoji_Component EComp
Emoji_Modifier EMod
Emoji_Modifier_Base EBase
Emoji_Presentation EPres
Extended_Pictographic ExtPict
Extender Ext
Grapheme_Base Gr_Base
Grapheme_Extend Gr_Ext
Hex_Digit Hex
IDS_Binary_Operator IDSB
IDS_Trinary_Operator IDST
ID_Continue IDC
ID_Start IDS
Ideographic Ideo
Join_Control Join_C
Logical_Order_Exception LOE
Lowercase Lower
Math
Noncharacter_Code_Point NChar
Pattern_Syntax Pat_Syn
Pattern_White_Space Pat_WS
Quotation_Mark QMark
Radical
Regional_Indicator RI
Sentence_Terminal STerm
Soft_Dotted SD
Terminal_Punctuation Term
Unified_Ideograph UIdeo
Uppercase Upper
Variation_Selector VS
White_Space space
XID_Continue XIDC
XID_Start XIDS`.split(/\s/)
);

const JsUnicodePropertiesMap = new Map();
for (const p of JsUnicodeProperties) {
  JsUnicodePropertiesMap.set(slug(p), p);
}

const JsUnicodePropertiesOfStrings = new Set([
  // ES2024 properties of strings; none are supported by Oniguruma
  'Basic_Emoji',
  'Emoji_Keycap_Sequence',
  'RGI_Emoji',
  'RGI_Emoji_Flag_Sequence',
  'RGI_Emoji_Modifier_Sequence',
  'RGI_Emoji_Tag_Sequence',
  'RGI_Emoji_ZWJ_Sequence',
]);

const JsUnicodePropertiesOfStringsMap = new Map();
for (const p of JsUnicodePropertiesOfStrings) {
  JsUnicodePropertiesOfStringsMap.set(slug(p), p);
}

// Unlike Oniguruma's Unicode properties via `\p` and `\P`, these names are case sensitive and
// don't allow inserting whitespace and underscores. Definitions at
// <github.com/kkos/oniguruma/blob/master/doc/RE> (see: POSIX bracket: Unicode Case)
// Note: Handling in the transformer assumes all values here are a single, negateable node that's
// not pre-negated at the top level. It also uses ASCII versions of `graph` and `print` for target
// `ES2018` (which doesn't allow intersection) if `accuracy` isn't `strict`
const PosixClassesMap = new Map([
  ['alnum', r`[\p{Alpha}\p{Nd}]`],
  ['alpha', r`\p{Alpha}`],
  ['ascii', r`\p{ASCII}`],
  ['blank', r`[\p{Zs}\t]`],
  ['cntrl', r`\p{cntrl}`],
  ['digit', r`\p{Nd}`],
  ['graph', r`[\P{space}&&\P{cntrl}&&\P{Cn}&&\P{Cs}]`],
  ['lower', r`\p{Lower}`],
  ['print', r`[[\P{space}&&\P{cntrl}&&\P{Cn}&&\P{Cs}]\p{Zs}]`],
  ['punct', r`[\p{P}\p{S}]`], // Updated value from Oniguruma 6.9.9
  ['space', r`\p{space}`],
  ['upper', r`\p{Upper}`],
  ['word', r`[\p{Alpha}\p{M}\p{Nd}\p{Pc}]`],
  ['xdigit', r`\p{AHex}`],
]);

// Apart from the property names provided by Unicode, Oniguruma explicitly adds several names (see
// <github.com/kkos/oniguruma/blob/master/doc/RE>) that can be used within `\p{}` and `\P{}` (those
// below). These should be listed here in lowercase, though they aren't case sensitive when used
const PosixProperties = new Set([
  'alnum',
  'blank',
  'graph',
  'print',
  'word',
  'xdigit',
  // The following are available with the same name in JS (see `JsUnicodeProperties`), so can be
  // handled as standard Unicode properties
  // 'alpha', // (JS: Alpha)
  // 'ascii', // (JS: ASCII)
  // 'cntrl', // (JS: cntrl)
  // 'digit', // (JS: digit)
  // 'lower', // (JS: Lower)
  // 'punct', // (JS: punct)
  // 'space', // (JS: space)
  // 'upper', // (JS: Upper)
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

// Generates a Unicode property lookup name: lowercase, without spaces, hyphens, underscores
function slug(name) {
  return name.replace(/[- _]+/g, '').toLowerCase();
}

export {
  JsUnicodeProperties, // TODO: Move out
  JsUnicodePropertiesMap, // TODO: Move out
  JsUnicodePropertiesOfStringsMap, // TODO: Move out
  PosixClassNames,
  PosixClassesMap, // TODO: Move out
  PosixProperties, // TODO: Move out
  slug,
};

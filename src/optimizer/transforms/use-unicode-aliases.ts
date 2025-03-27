import type {CharacterSetNode} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

/**
Use Unicode property aliases.
*/
const useUnicodeAliases: Visitor = {
  CharacterSet(path: Path) {
    const {node} = path as Path<CharacterSetNode>;
    if (node.kind !== 'property') {
      return;
    }
    const alias = OnigUnicodeAliasMap.get(node.value);
    if (alias) {
      node.value = alias;
    }
  },
};

// Oniguruma doesn't include all Unicode property aliases; some are treated as POSIX class names
// and are excluded (see `PosixClassNames`)
const OnigUnicodeAliasMap = /* @__PURE__ */ new Map([
  // ## General category aliases
  ['Other', 'C'],
    ['Control', 'Cc'],
    ['Format', 'Cf'],
    ['Unassigned', 'Cn'],
    ['Private_Use', 'Co'],
    ['Surrogate', 'Cs'],
  ['Letter', 'L'],
    ['Cased_Letter', 'LC'],
    ['Lowercase_Letter', 'Ll'],
    ['Modifier_Letter', 'Lm'],
    ['Other_Letter', 'Lo'],
    ['Titlecase_Letter', 'Lt'],
    ['Uppercase_Letter', 'Lu'],
  ['Mark', 'M'],
  ['Combining_Mark', 'M'],
    ['Spacing_Mark', 'Mc'],
    ['Enclosing_Mark', 'Me'],
    ['Nonspacing_Mark', 'Mn'],
  ['Number', 'N'],
    ['Decimal_Number', 'Nd'],
    ['Letter_Number', 'Nl'],
    ['Other_Number', 'No'],
  ['Punctuation', 'P'],
  // `punct` is also a POSIX class name, but it's included in the Oniguruma property list since the
  // POSIX class version uses a different value starting with Oniguruma 6.9.9
  ['punct', 'P'],
    ['Connector_Punctuation', 'Pc'],
    ['Dash_Punctuation', 'Pd'],
    ['Close_Punctuation', 'Pe'],
    ['Final_Punctuation', 'Pf'],
    ['Initial_Punctuation', 'Pi'],
    ['Other_Punctuation', 'Po'],
    ['Open_Punctuation', 'Ps'],
  ['Symbol', 'S'],
    ['Currency_Symbol', 'Sc'],
    ['Modifier_Symbol', 'Sk'],
    ['Math_Symbol', 'Sm'],
    ['Other_Symbol', 'So'],
  ['Separator', 'Z'],
    ['Line_Separator', 'Zl'],
    ['Paragraph_Separator', 'Zp'],
    ['Space_Separator', 'Zs'],
  // ## Binary property aliases
  ['ASCII_Hex_Digit', 'AHex'],
  ['Bidi_Control', 'Bidi_C'],
  ['Case_Ignorable', 'CI'],
  ['Changes_When_Casefolded', 'CWCF'],
  ['Changes_When_Casemapped', 'CWCM'],
  ['Changes_When_Lowercased', 'CWL'],
  ['Changes_When_Titlecased', 'CWT'],
  ['Changes_When_Uppercased', 'CWU'],
  ['Default_Ignorable_Code_Point', 'DI'],
  ['Deprecated', 'Dep'],
  ['Diacritic', 'Dia'],
  ['Emoji_Component', 'EComp'],
  ['Emoji_Modifier', 'EMod'],
  ['Emoji_Modifier_Base', 'EBase'],
  ['Emoji_Presentation', 'EPres'],
  ['Extended_Pictographic', 'ExtPict'],
  ['Extender', 'Ext'],
  ['Grapheme_Base', 'Gr_Base'],
  ['Grapheme_Extend', 'Gr_Ext'],
  ['Grapheme_Link', 'Gr_Link'],
  ['Hex_Digit', 'Hex'],
  ['IDS_Binary_Operator', 'IDSB'],
  ['IDS_Trinary_Operator', 'IDST'],
  ['IDS_Unary_Operator', 'IDSU'],
  ['ID_Continue', 'IDC'],
  ['ID_Start', 'IDS'],
  ['Ideographic', 'Ideo'],
  ['Join_Control', 'Join_C'],
  ['Logical_Order_Exception', 'LOE'],
  ['Noncharacter_Code_Point', 'NChar'],
  ['Other_Alphabetic', 'OAlpha'],
  ['Other_Default_Ignorable_Code_Point', 'ODI'],
  ['Other_Grapheme_Extend', 'OGr_Ext'],
  ['Other_ID_Continue', 'OIDC'],
  ['Other_ID_Start', 'OIDS'],
  ['Other_Lowercase', 'OLower'],
  ['Other_Math', 'OMath'],
  ['Other_Uppercase', 'OUpper'],
  ['Pattern_Syntax', 'Pat_Syn'],
  ['Pattern_White_Space', 'Pat_WS'],
  ['Prepended_Concatenation_Mark', 'PCM'],
  ['Quotation_Mark', 'QMark'],
  ['Regional_Indicator', 'RI'],
  ['Sentence_Terminal', 'STerm'],
  ['Soft_Dotted', 'SD'],
  ['Terminal_Punctuation', 'Term'],
  ['Unified_Ideograph', 'UIdeo'],
  ['Variation_Selector', 'VS'],
  ['White_Space', 'WSpace'],
  ['XID_Continue', 'XIDC'],
  ['XID_Start', 'XIDS'],
  // ## Script aliases
  // [TODO] Add script aliases
]);

export {
  useUnicodeAliases,
};

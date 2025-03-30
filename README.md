# `oniguruma-parser`

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]

[Oniguruma](https://github.com/kkos/oniguruma) is an advanced regular expression engine written in C that's used in Ruby (via a fork named Onigmo), PHP (`mb_ereg`, etc.), TextMate grammars (used by VS Code, GitHub, [Shiki](https://shiki.style/), etc. for syntax highlighting), and many other tools.

`oniguruma-parser` is a TypeScript library for parsing, validating, traversing, transforming, and optimizing Oniguruma regular expressions. It's been battle-tested by [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es) and [`tm-grammars`](https://github.com/shikijs/textmate-grammars-themes), which are used by Shiki to process tens of thousands of real-world Oniguruma regexes.

## Contents

- [Install and use](#install-and-use)
- [Generate an AST](#generate-an-ast)
- [Traverse and transform an AST](#traverse-and-transform-an-ast)
- [Optimize regexes](#optimize-regexes)
- [Known differences](#known-differences)

## Install and use

```sh
npm install oniguruma-parser
```

```js
import {toOnigurumaAst} from 'oniguruma-parser';

const ast = toOnigurumaAst('.*');
console.log(ast.pattern.alternatives[0].elements[0]);
/* → {
  type: 'Quantifier',
  kind: 'greedy',
  min: 0,
  max: Infinity,
  element: {
    type: 'CharacterSet',
    kind: 'dot',
  },
} */
```

The following modules are available in addition to the root `'oniguruma-parser'` export:

- [Parser module](https://github.com/slevithan/oniguruma-parser/blob/main/src/parser/README.md): Includes `parse` which is similar to `toOnigurumaAst` but adds options for specialized use. Also exports numerous functions and types for constructing and working with `OnigurumaAst` nodes.
- [Generator module](https://github.com/slevithan/oniguruma-parser/blob/main/src/generator/README.md): Convert an `OnigurumaAst` to pattern and flags strings.
- [Optimizer module](https://github.com/slevithan/oniguruma-parser/blob/main/src/optimizer/README.md): Minify and improve the performance of Oniguruma regexes.
- [Traverser module](https://github.com/slevithan/oniguruma-parser/blob/main/src/traverser/README.md): Traverse and transform an `OnigurumaAst`.

## Generate an AST

To parse an Oniguruma regex pattern (with optional flags and compile-time options) and return an AST, call `toOnigurumaAst`, which uses the following type definition:

```ts
function toOnigurumaAst(
  pattern: string,
  options?: {
    flags?: string;
    rules?: {
      captureGroup?: boolean;
      singleline?: boolean;
    };
  }
): OnigurumaAst;
```

An error is thrown if the pattern or flags aren't valid in Oniguruma.

## Traverse and transform an AST

See details and examples in the [traverser module's readme](https://github.com/slevithan/oniguruma-parser/blob/main/src/traverser/README.md).

## Optimize regexes

This library includes one of the few implementations (for any regex flavor) of a "regex optimizer" that can minify and improve the performance and readability of regexes prior to use. Such transformations must be specific to a particular regex flavor in order to be accurate, and `oniguruma-parser`'s [optimizer module](https://github.com/slevithan/oniguruma-parser/blob/main/src/optimizer/README.md) is of course built for Oniguruma regexes.

Example:

```
(?x) (?:\!{1,}) (\p{Nd}aa|\p{Nd}ab|\p{Nd}az) [[^0-9A-Fa-f]\p{ Letter }] [\p{L}\p{M}\p{N}\p{Pc}]
```

Becomes:

```
!+(\da[abz])[\H\p{L}]\w
```

Optimized regexes always match exactly the same strings.

> [!TIP]
> Try the [optimizer demo](https://slevithan.github.io/oniguruma-parser/demo/).

## Known differences

Known differences will be resolved in future versions.

### Unsupported features that throw an error

The following rarely-used features throw errors since they aren't yet supported:

- Rarely-used character specifiers: Non-A-Za-z with `\cx` `\C-x`, meta `\M-x` `\M-\C-x`, bracketed octals `\o{…}`, and octal encoded bytes ≥ `\200`.
- Code point sequences: `\x{H H …}`, `\o{O O …}`.
- Absent expressions `(?~|…|…)`, stoppers `(?~|…)`, and clearers `(?~|)`.
- Conditionals: `(?(…)…)`, etc.
- Callouts: `(?{…})`, `(*…)`, etc.
- Numbered *forward* backreferences (incl. relative `\k<+N>`) and backreferences with recursion level (`\k<N+N>`, etc.).
- Flags `y{g}`/`y{w}` (grapheme boundary modes); whole-pattern modifiers `C` (don't capture group), `I` (ignore-case is ASCII), `L` (find longest); flags `D`, `P`, `S`, `W` (digit/POSIX/space/word is ASCII) within mode modifiers.

Despite these gaps, **more than 99.99% of real-world Oniguruma regexes are supported**, based on a sample of ~55k regexes used in TextMate grammars (conditionals were used in three regexes, and other unsupported features weren't used at all). Some of the Oniguruma features above are so exotic that they aren't used in *any* public code on GitHub.

<details>
  <summary>More details about numbered forward backreferences</summary>

This library currently treats it as an error if a numbered backreference comes before its referenced group. This is a rare issue because:

- Most such placements are mistakes and can never match, due to Oniguruma's behavior for backreferences to nonparticipating groups.
- Erroring matches the correct behavior of named backreferences.
- For unenclosed backreferences, this only affects `\1`–`\9` since it's not a backreference in the first place if using `\10` or higher and not as many capturing groups are defined to the left (it's an octal or identity escape).
</details>

### Unsupported validation errors

The following don't yet throw errors, but should:

- Special characters that are invalid in backreference names when referencing a valid group with that name.
  - Named backreferences should use a more restricted set of allowed characters than named groups and subroutines.
  - Note that an error is already thrown for backreference names that include `-` or `+` (separate from relative *numbered* backreferences).
- Subroutines used in ways that resemble infinite recursion ([#5](https://github.com/slevithan/oniguruma-parser/issues/5)).
  - Such subroutines error at compile time in Oniguruma.

### Behavior differences

#### Unenclosed four-digit backreferences

Although any number of digits are supported for enclosed `\k<…>`/`\k'…'` backreferences (assuming the backreference refers to a valid capturing group), unenclosed backreferences currently support only up to three digits (`\999`). In other words, `\1000` is handled as `\100` followed by `0` even if 1,000+ captures appear to the left.

Note that, although Oniguruma theoretically supports `\1000` and higher when as many capturing groups appear to the left, Oniguruma regexes with more than 999 captures never actually work. They fail to match anything, with no error, due to an apparent bug. Tested in Oniguruma 6.9.8 via `vscode-oniguruma`.

#### Erroring on patterns that trigger Oniguruma bugs

This library was originally built as part of [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es), and in that context it made sense to throw an error for regexes that trigger Oniguruma bugs. However, as a standalone parser, the ideal path is to follow Oniguruma's intention even if the pattern would encounter bugs when used to search. Thus, some of the errors described here will be removed in future versions.

<details>
  <summary>Nested absent functions</summary>

Nested absent functions like `(?~(?~…))` don't throw an error in Oniguruma, but they produce self-described "strange" results, and Oniguruma's docs state that "nested absent functions are not supported and the behavior is undefined".

In this library, they throw an error.
</details>

<details>
  <summary>Bare <code>\x</code> as a <code>NUL</code> character</summary>

> **Context:** `\xH`, `\xHH`, and `\x{H…}` are all supported, where *H* is a hexadecimal digit. Although enclosed `\x{H…}` is a code point escape, unenclosed `\xH` and `\xHH` represent an encoded byte (which, unlike in other regex flavors, makes `\xHH` a fragment of a code unit if its value is `\x80` to `\xFF`). The following describes the use of `\x` on its own, when it's not a part of any of these forms.

In Oniguruma, `\x` is an escape for the `NUL` character (equivalent to `\0`, `\x0`, `\x00`, etc.) if not followed by `{` or a hexadecimal digit.

In this library, it throws an error.

The error is thrown because `\x` is buggy in Oniguruma. It's also ambiguous, non-portable across regex flavors, offers no user benefit (`\0` is equally short), unintuitive, and not relied on by users (none of the Oniguruma regexes in a sample of tens of thousands used it).

Behavior details for `\x` in Oniguruma:

- `\x` is an identity escape (matching a literal `x`) if it appears at the very end of a pattern. *This is an apparent bug.*
- `\x` is an error if followed by a `{` that's followed by a hexadecimal digit that doesn't form a valid `\x{…}` code point escape. Ex: `\x{F` and `\x{0,2}` are errors.
- `\x` is an identity escape (matching a literal `x`) if followed by a `{` that isn't followed by a hexadecimal digit. Ex: `\x{` matches `x{`, `\x{G` matches `x{G`, `\x{}` matches `x{}`, and `\x{,2}` matches 0–2 `x` characters since `{,2}` is a quantifier with an implicit 0 min.

As a result of these rules, `\x{` can be any of:

1. An identity escape followed by a literal `{`.
2. An identity escape followed by part of a quantifier.
3. Part of a valid code point escape.
4. Part of an error.
</details>

<details>
  <summary>Pattern-terminating bare <code>\u</code> as an identity escape</summary>

Normally, any incomplete `\uHHHH` (including bare `\u`) throws an error. However, in Oniguruma, bare `\u` is treated as an identity escape (matching a literal `u`) if it appears at the very end of a pattern. *This is an apparent bug.*

In this library, incomplete `\u` is always an error.
</details>

<details>
  <summary>Invalid encoded byte <code>\x80</code> to <code>\xFF</code></summary>

> **Context:** Unlike enclosed `\x{HH}`, unenclosed `\xHH` represents an encoded byte (not a code unit or code point), which means that `\x80` to `\xFF` are treated as fragments of a code unit, unlike in other regex flavors. Ex: `[\0-\xE2\x82\xAC]` is equivalent to `[\0-\x{20AC}]`.
>
> Additionally, the default-on Oniguruma compile-time option `ONIG_SYN_ALLOW_INVALID_CODE_END_OF_RANGE_IN_CC` means that invalid encoded byte or code point values used at the end of a character class range are treated as if they were the last preceding valid value. Ex: `[\0-\x{FFFFFFFF}]` is equivalent to `[\0-\x{10FFFF}]`, and `[\0-\FF]` is equivalent to `[\0-\7F]` (or rather, it should be, as described below).

The Oniguruma behavior for invalid encoded byte sequences is undefined. Oniguruma docs simply state: "Do not pass invalid byte string in the regex character encoding."

In this library, it throws an error.

Behavior details for invalid encoded bytes in Oniguruma:

- Standalone `\x80` to `\xBF` throw error "invalid code point value".
- Standalone `\xC0` to `\xF4` throw error "too short multibyte code string".
- Standalone `\xF5` to `\xFF` don't throw, but fail to match anything. *This is an apparent bug.*
- If used at the end of a character class range:
  - Standalone `\x80` to `\xBF` and `\xF5` to `\xFF` are treated as `\x7F`.
  - Standalone `\xC0` to `\xF4` throw error "too short multibyte code string". *This is an apparent bug.*
  - If the range is within a non-nested, negated character class, `\xF5` to `\xFF` don't throw, but fail to match anything. *This is an apparent bug, which can be worked around by nesting the class.*
</details>

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors).

If you want to support this project, I'd love your help by [contributing](https://github.com/slevithan/oniguruma-parser/blob/main/CONTRIBUTING.md) improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/oniguruma-parser?color=78C372
[npm-version-href]: https://npmjs.com/package/oniguruma-parser
[npm-downloads-src]: https://img.shields.io/npm/dm/oniguruma-parser?color=78C372
[npm-downloads-href]: https://npmjs.com/package/oniguruma-parser
[bundle-src]: https://img.shields.io/bundlejs/size/oniguruma-parser?color=78C372&label=minzip
[bundle-href]: https://bundlejs.com/?q=oniguruma-parser&treeshake=[*]

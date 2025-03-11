# `oniguruma-parser`

[![npm version][npm-version-src]][npm-version-href]

[Oniguruma](https://github.com/kkos/oniguruma) is an advanced regular expression engine written in C that's used in Ruby (via a fork named Onigmo), PHP (`mb_ereg`, etc.), TextMate grammars (used by VS Code, GitHub, Shiki, etc. for syntax highlighting), and many other tools.

`oniguruma-parser` is a JavaScript library that can be used to parse, validate, traverse, transform, and optimize Oniguruma regular expressions.

To parse a regex and return an AST, call `toOnigurumaAst`, which uses the following type definition:

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

An error is thrown if the pattern isn't valid in Oniguruma.

Additional exports are available that provide access to the [Parser](https://github.com/slevithan/oniguruma-parser/blob/main/src/parser/README.md) (which includes more options), [Traverser](https://github.com/slevithan/oniguruma-parser/blob/main/src/traverser/README.md), [Generator](https://github.com/slevithan/oniguruma-parser/blob/main/src/generator/README.md), and [Optimizer](https://github.com/slevithan/oniguruma-parser/blob/main/src/optimizer/README.md) modules.

> [!TIP]
> Try the [optimizer/generator demo](https://slevithan.github.io/oniguruma-parser/demo/).

`oniguruma-parser` has been battle-tested by [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es) and [`tm-grammars`](https://github.com/shikijs/textmate-grammars-themes), which use it to process tens of thousands of real-world Oniguruma regexes.

## Known differences

Known differences will be resolved in future versions. Contributions are welcome.

<details>
  <summary><b>Unsupported features</b></summary>

The following rarely-used features throw errors since they aren't yet supported:

- Rarely-used character specifiers: Non-A-Za-z with `\cx`, `\C-x`; meta `\M-x`, `\M-\C-x`; bracketed octals `\o{…}`; octal UTF-8 encoded bytes (≥ `\200`).
- Code point sequences: `\x{H H …}`, `\o{O O …}`.
- Absent expressions `(?~|…|…)`, stoppers `(?~|…)`, and clearers `(?~|)`.
- Conditionals: `(?(…)…)`, etc.
- Callouts: `(?{…})`, `(*…)`, etc.
- Numbered forward backreferences (including relative `\k<+N>`), and backreferences with recursion level.
- Flags `y{g}`/`y{w}` (grapheme boundary modes); whole-pattern modifiers `C` (don't capture group), `I` (ignore-case is ASCII), `L` (find longest); flags `D`, `P`, `S`, `W` (digit/POSIX/space/word is ASCII) within mode modifiers.

Despite these gaps, more than 99.99% of real-world Oniguruma regexes are supported, based on a sample of ~55k regexes used in TextMate grammars (conditionals were used in three regexes, and other unsupported features weren't used at all). Some of the Oniguruma features above are so exotic that they aren't used in *any* public code on GitHub.

  <details>
    <summary>More details about numbered forward backreferences</summary>

  This library currently treats it as an error if numbered backreferences come before their referenced group.

  - Most such placements are mistakes and can never match, due to Oniguruma's behavior for backreferences to nonparticipating groups.
  - Erroring matches the correct behavior of named backreferences.
  - For unenclosed backreferences, this only affects `\1`–`\9` since it's not a backreference in the first place if using `\10` or higher and not as many capturing groups are defined to the left (it's an octal or identity escape).
  </details>
</details>

<details>
  <summary><b>Unsupported errors</b></summary>

The following don't yet throw errors, but should:

- Special characters that are invalid in backreference names when referencing a valid group with that name.
  - Named backreferences should use a more restricted set of allowed characters than named groups and subroutines.
  - An error is already thrown for backreference names that include `-` or `+`.
- Subroutines used in ways that resemble infinite recursion.
  - Such subroutines error at compile time in Oniguruma.
</details>

<details>
  <summary><b>Unenclosed four-digit backreferences</b></summary>

Although any number of digits are supported for enclosed `\k<…>`/`\k'…'` backreferences (assuming the backreference refers to a valid capturing group), unenclosed backreferences currently support only up to three digits (`\999`). In other words, `\1000` is handled as `\100` followed by `0` even if 1,000+ captures appear to the left.

Note that, although Oniguruma theoretically supports `\1000` and higher when as many capturing groups appear to the left, Oniguruma regexes with more than 999 captures never actually work. They fail to match anything, with no error, due to an apparent bug. Tested in Oniguruma 6.9.8 via `vscode-oniguruma`.
</details>

Additional edge case differences that result in errors will be documented here soon. This library was originally built as part of [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es), and in that context it made sense to throw an error in some edge cases that are buggy in Oniguruma. However, as a standalone parser, in most cases the ideal path is to match Oniguruma's intention, even if the pattern would encounter bugs when used to search. Thus, such errors will be removed in future versions.

## About

Created by [Steven Levithan](https://github.com/slevithan). If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/oniguruma-parser?color=78C372
[npm-version-href]: https://npmjs.com/package/oniguruma-parser

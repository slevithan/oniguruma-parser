# oniguruma-parser

This library can be used to create, traverse, transform, validate, and optimize Oniguruma regular expressions and ASTs. It was originally built for [Oniguruma-To-ES](https://github.com/slevithan/oniguruma-to-es).

The core function is `toOnigurumaAst`, which returns an Oniguruma AST generated from an Oniguruma pattern.

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

Additional exports are available that provide access to the [tokenizer](https://github.com/slevithan/oniguruma-parser/tree/main/src/tokenizer), [parser](https://github.com/slevithan/oniguruma-parser/tree/main/src/parser), [traverser](https://github.com/slevithan/oniguruma-parser/tree/main/src/traverser), [generator](https://github.com/slevithan/oniguruma-parser/tree/main/src/generator), and [optimizer](https://github.com/slevithan/oniguruma-parser/tree/main/src/optimizer).

## Unsupported features

The following throw errors since they aren't yet supported. They're all extremely rare.

- Rarely-used character specifiers: Non-A-Za-z with `\cx`, `\C-x`; meta `\M-x`, `\M-\C-x`; bracketed octals `\o{…}`; octal UTF-8 encoded bytes (≥ `\200`).
- Code point sequences: `\x{H H …}`, `\o{O O …}`.
- Absent expressions `(?~|…|…)`, stoppers `(?~|…)`, and clearers `(?~|)`.
- Conditionals: `(?(…)…)`, etc.
- Callouts: `(?{…})`, `(*…)`, etc.
- Flags `y{g}`/`y{w}` (grapheme boundary modes); whole-pattern modifiers `C` (don't capture group), `I` (ignore-case is ASCII), `L` (find longest); flags `D`, `P`, `S`, `W` (digit/POSIX/space/word is ASCII) within mode modifiers.

The following don't yet throw errors, but should:

- Special characters that are invalid in backreference names when referencing a valid group name that includes such characters.
- Subroutines used in ways that resemble infinite recursion.

Keep in mind that some Oniguruma features are so exotic that they aren't used in *any* public code on GitHub. This library supports more than 99.99% of real-world Oniguruma regexes, based on a sample of ~55k regexes used in TextMate grammars. Conditionals were used in three regexes, and other unsupported features weren't used at all.

Contributions that add support for remaining features are welcome.

## Known differences

Known differences will be resolved in future versions.

- This library (but not Oniguruma) treats it as an error if numbered backreferences come before their referenced group.
  - Most such placements are mistakes and can never match (based on the Oniguruma behavior for backreferences to nonparticipating groups).
  - Erroring matches the behavior of named backreferences.
  - This only affects `\1`–`\9`, since it's not a backreference in the first place if using `\10` or higher and not as many capturing groups are defined to the left (it's an octal or identity escape).
- Cases where this library throws errors for edge case features that are buggy in Oniguruma will be documented here soon.

## About

Created by [Steven Levithan](https://github.com/slevithan). If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

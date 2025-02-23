# `oniguruma-parser`

This library was initially built for [Oniguruma-To-ES](https://github.com/slevithan/oniguruma-to-es). It can be used wherever you want to generate, validate, or traverse ASTs for Oniguruma regular expressions.

The primary function of this library is `toOnigurumaAst`, which returns an Oniguruma AST generated from an Oniguruma pattern.

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

Additional exports are available that provide access to the tokenizer, parser, traverser, etc.

## Unsupported features

The following throw errors since they aren't yet supported. They're all extremely rare.

- Rarely-used character specifiers: Non-A-Za-z with `\cx`, `\C-x`; meta `\M-x`, `\M-\C-x`; bracketed octals `\o{…}`; octal UTF-8 encoded bytes (≥ `\200`).
- Code point sequences: `\x{H H …}`, `\o{O O …}`.
- Grapheme boundaries: `\y`, `\Y`.
- Absent expressions `(?~|…|…)`, stoppers `(?~|…)`, and clearers `(?~|)`.
- Conditionals: `(?(…)…)`, etc.
- Callouts: `(?{…})`, `(*…)`, etc.
- Flags `P` (POSIX is ASCII) and `y{g}`/`y{w}` (grapheme boundary modes). Also flags `D`, `S`, `W` in mode modifiers, and whole-pattern modifiers `C` (don't capture group), `I` (ignore-case is ASCII), `L` (find longest).

The following don't yet throw errors, but should:

- Subroutines used in ways that resemble infinite recursion.

Keep in mind that some Oniguruma features are so exotic that they aren't used in *any* public code on GitHub. `oniguruma-parser` supports ~99.99% of real-world Oniguruma regexes, based on a sample of 54,531 regexes used in 219 TextMate grammars.

## Intentional differences

- This library (but not Oniguruma) treats it as an error for numbered backreferences to come before their referenced group.
  - Most such placements are mistakes and can never match (based on the Oniguruma behavior for backreferences to nonparticipating groups).
  - Erroring matches the behavior of named backreferences.
  - This only applies to `\1`–`\9`, since it's not a backreference in the first place if using `\10` or higher and not as many capturing groups are defined to the left (it's an octal or identity escape).

## About

`oniguruma-parser` was created by [Steven Levithan](https://github.com/slevithan).

If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

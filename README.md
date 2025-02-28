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

Additional exports are available that provide access to the [parser](https://github.com/slevithan/oniguruma-parser/tree/main/src/parser), [traverser](https://github.com/slevithan/oniguruma-parser/tree/main/src/traverser), [generator](https://github.com/slevithan/oniguruma-parser/tree/main/src/generator), and [optimizer](https://github.com/slevithan/oniguruma-parser/tree/main/src/optimizer).

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
- Relative forward backreferences `\k<+N>` and backrefences with recursion level.
- Flags `y{g}`/`y{w}` (grapheme boundary modes); whole-pattern modifiers `C` (don't capture group), `I` (ignore-case is ASCII), `L` (find longest); flags `D`, `P`, `S`, `W` (digit/POSIX/space/word is ASCII) within mode modifiers.

Despite these gaps, more than 99.99% of real-world Oniguruma regexes are supported, based on a sample of ~55k regexes used in TextMate grammars (conditionals were used in three regexes, and other unsupported features weren't used at all).

Some of the Oniguruma features above are so exotic that they aren't used in *any* public code on GitHub.
</details>

<details>
  <summary><b>Unsupported errors</b></summary>

The following don't yet throw errors, but should:

- Special characters (apart from `-`, `+`) that are invalid in backreference names when referencing a valid group with that name.
  - Named backreferences have a more restricted set of allowed characters than named groups and subroutines.
- Subroutines used in ways that resemble infinite recursion.
  - Such subroutines error in Oniguruma, and do not result in infinite recursion.
</details>

<details>
  <summary><b>Forward backreferences</b></summary>

This library currently treats it as an error if numbered backreferences come before their referenced group.

- Most such placements are mistakes and can never match, due to Oniguruma's behavior for backreferences to nonparticipating groups.
- Erroring matches the behavior of named backreferences.
- For unenclosed backreferences, this affects only `\1`–`\9`. It's not a backreference in the first place if using `\10` or higher and not as many capturing groups are defined to the left (it's an octal or identity escape).

Additionally, this library doesn't yet support the `\k<+N>`/`\k'+N'` syntax for relative forward backreferences.
</details>

<details>
  <summary><b>Unenclosed four-digit backreferences</b></summary>

Although enclosed `\k<…>`/`\k'…'` with any number of digits is supported (assuming the backreference refers to a valid capturing group), unenclosed backreferences currently only support up to three digits (`\999`). Oniguruma supports `\1000` and higher when as many capturing groups are defined to the left, but no Oniguruma regex with more than 999 captures actually works, due to an apparent bug (it will fail to match anything, with no error). Tested in Oniguruma 6.9.8.
</details>

Additional cases where this library throws for edge cases that are buggy in Oniguruma will be documented here soon.

## About

Created by [Steven Levithan](https://github.com/slevithan). If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

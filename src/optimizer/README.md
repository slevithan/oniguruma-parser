# `oniguruma-parser`: Optimizer module

[Oniguruma](https://github.com/kkos/oniguruma) is an advanced regular expression engine written in C that's used in Ruby (via a fork named Onigmo), PHP (`mb_ereg`, etc.), TextMate grammars (used by VS Code, GitHub, Shiki, etc. for syntax highlighting), and many other tools.

`onigurua-parser`'s optimizer transforms Oniguruma patterns into optimized versions of themselves. This optimization includes both minification and performance improvements. Optimized regexes always match *exactly* the same strings.

Example:

```
(?x) (?:\!{1,}) (\p{Nd}aa|\p{Nd}ab|\p{Nd}az) [[^0-9A-Fa-f]\p{ Letter }] [\p{L}\p{M}\p{N}\p{Pc}]
```

Becomes:

```
!+(\da[abz])[\H\p{L}]\w
```

## [Try the Optimizer demo](https://slevithan.github.io/oniguruma-parser/demo/)

## Benefits

- Optimized regexes are shorter; good for minification.
- Optimized regexes are typically easier to read, unless the original used flag `x` for insignificant whitespace and comments (which are removed during optimization).
- Some optimizations can improve performance and eliminate or reduce the risk of ReDoS.

The optimizer's primary purpose is minification, but it also attempts to improve regex performance. It avoids transformations that might shorten the pattern in some contexts but be problematic in others (e.g., by triggering edge case Oniguruma bugs). In rare cases, results might be slightly longer than the input.

The optimizer has been battle-tested by [`tm-grammars`](https://github.com/shikijs/textmate-grammars-themes), which is used by [Shiki](https://shiki.style/) to process tens of thousands of real-world Oniguruma regexes.

## Import

```js
import {optimize} from 'oniguruma-parser/optimizer';
```

## Type definition

```ts
function optimize(
  pattern: string;
  options?: {
    flags?: string;
    override?: {[key in OptimizationName]?: boolean};
    rules?: {
      captureGroup?: boolean;
      singleline?: boolean;
    };
  }
): {
  pattern: string;
  flags: string;
};
```

### Flags

Although the optimizer takes provided flags into account and includes a `flags` property on the returned object, it never changes top-level flags in ways that would change the meaning of the regex if you didn't provide the updated flags to Oniguruma. As a result, the optimized pattern can be used in situations when you aren't able to change flags. For example, the optimizer removes `x` from the returned flags (since its effects are always applied), but it doesn't add flags.

## Optimizations

### Always on

The following optimizations are always enabled. They result from the nature of the parser, which builds an AST.

| Description | Example |
|-|-|
| Remove comment groups | `(?#comment)a` → `a` |
| Remove free-spacing and line comments with flag `x` | `(?x) a b` → `(?x)ab` |
| Remove duplicate flags in mode modifiers | `(?ii-m-m)` → `(?i-m)` |
| Normalize Unicode property names | `\p{-IDS- TART}` → `\p{ID_Start}` |
| Resolve relative backreference/subroutine numbers | `()\k<-1>` → `()\k<1>` |

### On by default

Some of the following optimizations (related to the representation of tokens) don't yet have names listed because, currently, they're always enabled. They'll become optional in future versions (see [issue](https://github.com/slevithan/oniguruma-parser/issues/1)).

🚀 = Can improve performance.

<table>
  <tr>
    <th></th>
    <th>Optimization name</th>
    <th>Description</th>
    <th>Example</th>
  </tr>

  <tr>
    <th rowspan="3" valign="top" align="left">
      Alternation
    </th>
    <td><code>alternationToClass</code> 🚀</td>
    <td>Use character classes for adjacent alternatives with single-length values</td>
    <td><code>a|b|\d</code> → <code>[ab\d]</code></td>
  </tr>
  <tr>
    <td><code>extractPrefix</code> 🚀</td>
    <td>Extract nodes at the start of every alternative into a prefix</td>
    <td><code>^aa|^abb|^ac</code> → <code>^a(?:a|bb|c)</code></td>
  </tr>
  <tr>
    <td><code>extractPrefix2</code> 🚀</td>
    <td>Extract alternating prefixes if patterns are repeated for each prefix</td>
    <td><code>^a|!a|^bb|!bb|^c|!c</code> → <code>(?:^|!)(?:a|bb|c)</code></td>
  </tr>

  <tr>
    <th rowspan="2" valign="top" align="left">
      Backrefs and<br>subroutines
    </th>
    <td></td>
    <td>Unenclose numbered backreferences</td>
    <td><code>()\k&lt;1></code> → <code>()\1</code></td>
  </tr>
  <tr>
    <td></td>
    <td>Remove leading zeros from backreference/subroutine numbers</td>
    <td><code>()\k&lt;01></code> → <code>()\k&lt;1></code></td>
  </tr>

  <tr>
    <th rowspan="4" valign="top" align="left">
      Characters
    </th>
    <td></td>
    <td>Remove unnecessary escapes</td>
    <td><code>\![\?]</code> → <code>![?]</code></td>
  </tr>
  <tr>
    <td></td>
    <td>Use the simplest character representation</td>
    <td><code>\u0061</code> → <code>a</code></td>
  </tr>
  <tr>
    <td></td>
    <td>Encoded bytes to code points</td>
    <td><code>\xE2\x82\xAC</code> (U+20AC) → <code>€</code></td>
  </tr>
  <tr>
    <td></td>
    <td>Remove leading zeros from enclosed code point escapes</td>
    <td><code>\x{000ABCDE}</code> → <code>\x{ABCDE}</code></td>
  </tr>

  <tr>
    <th rowspan="4" valign="top" align="left">
      Character<br>classes
    </th>
    <td><code>dedupeClasses</code></td>
    <td>Remove duplicate characters, sets, and ranges from character classes</td>
    <td><code>[a\x61]</code> → <code>[a]</code></td>
  </tr>
  <tr>
    <td><code>unnestUselessClasses</code></td>
    <td>Unnest character classes when possible</td>
    <td>
      <code>[a[b]]</code> → <code>[ab]</code>,<br>
      <code>[^[^a]]</code> → <code>[a]</code>
    </td>
  </tr>
  <tr>
    <td><code>unwrapNegationWrappers</code></td>
    <td>Unwrap negated classes used to negate an individual character set</td>
    <td><code>[^\d]</code> → <code>\D</code></td>
  </tr>
  <tr>
    <td><code>unwrapUselessClasses</code></td>
    <td>Unwrap outermost non-negated character classes containing a single character or character set</td>
    <td><code>[a]</code> → <code>a</code></td>
  </tr>

  <tr>
    <th rowspan="4" valign="top" align="left">
      Character sets
    </th>
    <td><code>useShorthands</code></td>
    <td>Use shorthands (<code>\d</code>, <code>\h</code>, <code>\s</code>, etc.) when possible</td>
    <td><code>[[:space:]\p{Nd}]</code> → <code>[\s\d]</code></td>
  </tr>
  <tr>
    <td><code>useUnicodeAliases</code></td>
    <td>Use Unicode property aliases</td>
    <td><code>\p{ID_Start}</code> → <code>\p{IDS}</code></td>
  </tr>
  <tr>
    <td><code>useUnicodeProps</code></td>
    <td>Use Unicode properties when possible</td>
    <td><code>[\0-\x{10FFFF}]</code> → <code>[\p{Any}]</code></td>
  </tr>
  <tr>
    <td></td>
    <td>Use outer negation for Unicode properties</td>
    <td><code>\p{^L}</code> → <code>\P{L}</code></td>
  </tr>

  <tr>
    <th rowspan="1" valign="top" align="left">
      Flags
    </th>
    <td><code>removeUselessFlags</code></td>
    <td>Remove flags (from top-level and modifiers) that have no effect</td>
    <td><code>(?x)a</code> → <code>a</code></td>
  </tr>

  <tr>
    <th rowspan="2" valign="top" align="left">
      Groups
    </th>
    <td><code>removeEmptyGroups</code></td>
    <td>Remove empty noncapturing, atomic, and flag groups, even if quantified</td>
    <td><code>(?:)a</code> → <code>a</code></td>
  </tr>
  <tr>
    <td><code>unwrapUselessGroups</code></td>
    <td>Unwrap nonbeneficial noncapturing and atomic groups</td>
    <td><code>(?:a)</code> → <code>a</code></td>
  </tr>

  <tr>
    <th rowspan="3" valign="top" align="left">
      Quantifiers
    </th>
    <td><code>preventReDoS</code> 🚀</td>
    <td>Remove identified ReDoS vulnerabilities without changing matches</td>
    <td><code>(?:.+)*!</code> → <code>(?:.)*!</code></td>
  </tr>
  <tr>
    <td></td>
    <td>Use symbols for quantifier ranges when possible</td>
    <td><code>a{1,}</code> → <code>a+</code></td>
  </tr>
  <tr>
    <td></td>
    <td>Remove leading zeros from quantifier ranges</td>
    <td><code>a{01,03}</code> → <code>a{1,3}</code></td>
  </tr>
</table>

Optimizations are applied in a loop until no further optimization progress is made. Individual optimization transforms are typically narrow and work best when combined with other optimizations.

## Disable specific optimizations

```js
import {optimize} from 'oniguruma-parser/optimizer';

const pattern = '...';
const optimized = optimize(pattern, {
  override: {
    // Disable specific optimizations
    removeEmptyGroups: false,
  },
});
```

## Enable only specific, optional optimizations

```js
import {optimize, getOptionalOptimizations} from 'oniguruma-parser/optimizer';

const pattern = '...';
const optimized = optimize(pattern, {
  override: {
    ...getOptionalOptimizations({disable: true}),
    // Enable specific optimizations
    removeEmptyGroups: true,
  },
});
```

## Contributing

Adding new optimization transforms is straightforward:

- Add your optimization in a new file, e.g. `src/optimizer/transforms/foo.js`.
- Import and list it in `src/optimizer/optimizations.js`.
- Add tests in `spec/optimizer/foo.spec.js`; run them via `pnpm test`.
- List it in this readme file with a simple example.

Optimizations should be independently useful and can compliment each other; you don’t need to do too much in one. Ideas for new optimizations are listed [here](https://github.com/slevithan/oniguruma-parser/issues/7).

## About

Created by [Steven Levithan](https://github.com/slevithan). If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

Inspiration for the optimizer module included [regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree), which includes an optimizer for JavaScript regexes.

MIT License.

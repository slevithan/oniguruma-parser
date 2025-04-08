# Optimizer module: `oniguruma-parser/optimizer`

The optimizer transforms [Oniguruma](https://github.com/kkos/oniguruma) patterns into optimized versions of themselves. This optimization includes both minification and performance improvements. Optimized regexes always match exactly the same strings, with the same subpattern matches.

> [!NOTE]
> Oniguruma is an advanced regular expression engine written in C that's used in Ruby (via a fork named Onigmo), PHP (`mb_ereg`, etc.), TextMate grammars (used by VS Code, GitHub, etc.), and many other tools.

Example:

```
(?x) (?:\!{1,}) (\b(?:ark|arm|art)\b) [[^0-9A-Fa-f]\P{^Nd}\p{ Letter }]
```

Becomes:

```
!+\b(ar[kmt])\b[\H\d\p{L}]
```

> [!TIP]
> 👉 Try the [optimizer demo](https://slevithan.github.io/oniguruma-parser/demo/).

The optimizer has been battle-tested by [`tm-grammars`](https://github.com/shikijs/textmate-grammars-themes), which is used by [Shiki](https://shiki.style/) to process tens of thousands of real-world Oniguruma regexes.

## Contents

- [Benefits](#benefits)
- [Install and use](#install-and-use)
- [Type definition](#type-definition)
- [Optimizations](#optimizations)
- [How performance optimizations work](#how-performance-optimizations-work)
- [Flags](#flags)
- [Disable specific optimizations](#disable-specific-optimizations)
- [Enable only specific, optional optimizations](#enable-only-specific-optional-optimizations)
- [Contributing](#contributing)

## Benefits

- Optimized regexes are shorter. Good for minification.
- Optimized regexes run faster. Some optimizations improve performance and can eliminate or reduce the risk of ReDoS.
- Optimized regexes are typically easier to read, unless the original used flag `x` for insignificant whitespace and comments (which are removed during optimization).

In rare cases, results might be slightly longer than the input.

## Install and use

```sh
npm install oniguruma-parser
```

```js
import {optimize} from 'oniguruma-parser/optimizer';

optimize('[a]');
// → {pattern: 'a', flags: ''}
```

## Type definition

```ts
function optimize(
  pattern: string;
  options?: {
    flags?: string;
    override?: {[key in OptimizationName]?: boolean};
    rules?: {
      allowOrphanBackrefs?: boolean;
      captureGroup?: boolean;
      singleline?: boolean;
    };
  }
): {
  pattern: string;
  flags: string;
};
```

## Optimizations

All of the following optimizations are on by default. Optimizations with names can optionally be disabled. Optimizations that don't yet have a name listed below are always enabled, but will become optional in future versions (see [issue](https://github.com/slevithan/oniguruma-parser/issues/1)).

🚀 = Can improve performance.

<table>
  <tr>
    <th></th>
    <th>Optimization name</th>
    <th>Description</th>
    <th>Example</th>
  </tr>

  <tr>
    <th rowspan="4" valign="top" align="left">
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
    <td><code>extractSuffix</code></td>
    <td>Extract nodes at the end of every alternative into a suffix</td>
    <td><code>aa$|bba$|ca$</code> → <code>(?:a|bb|c)a$</code></td>
  </tr>

  <tr>
    <th rowspan="3" valign="top" align="left">
      Backrefs and subroutines
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
    <td></td>
    <td>Resolve relative backreference/subroutine numbers</td>
    <td><code>()\k&lt;-1></code> → <code>()\k&lt;1></code></td>
  </tr>

  <tr>
    <th rowspan="1" valign="top" align="left">
      Callouts
    </th>
    <td><code>simplifyCallouts</code></td>
    <td>Cleanup callout arguments, removing redundant commas, leading zeros, and empty braces</td>
    <td><code>(*FAIL{,})a</code> → <code>(*FAIL)a</code></td>
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
      Character classes
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
    <th rowspan="2" valign="top" align="left">
      Comments and whitespace
    </th>
    <td></td>
    <td>Remove comment groups and flag <code>x</code> line comments</td>
    <td><code>(?#comment)a</code> → <code>a</code></td>
  </tr>
  <tr>
    <td></td>
    <td>Remove flag <code>x</code> insignificant whitespace</td>
    <td><code>(?x) a b</code> → <code>(?x)ab</code></td>
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
    <th rowspan="3" valign="top" align="left">
      Groups
    </th>
    <td><code>exposeAnchors</code></td>
    <td>Pull leading and trailing assertions out of capturing groups when possible; helps group unwrapping</td>
    <td><code>(^a$)</code> → <code>^(a)$</code></td>
  </tr>
  <tr>
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
    <td><code>(?:a+)*b</code> → <code>(?:a)*b</code></td>
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

Optimizations are applied in a loop until no further optimization progress is made. Individual optimization transforms are typically narrow and work best when combined with others.

The following additional optimizations are always enabled. They're not expected to become optional in the future, since they result from the nature of the parser.

| Description | Example |
|-|-|
| Remove duplicate flags | `(?ii-m-m)` → `(?i-m)` |
| Normalize Unicode property names | `\p{-IDS- TART}` → `\p{ID_Start}` |

## How performance optimizations work

Although the optimizer's primary purpose is minification, some optimizations can improve search-time performance by:

- Reducing backtracking.
  - Ex: Reducing use of alternation, or adjusting quantifiers.
  - Although Oniguruma includes numerous sophisticated internal optimizations and, in theory, this library's optimizations could be included directly in the engine, in practice, this library is able to find additional opportunities through a combination of cleverness and not having the same extremely tight constraints on compilation time.
- Triggering internal optimizations built into regex engines.
  - Ex: More clearly exposing that a particular token must match for any match to occur.

These effects can be significant. Additionally, though less significant, minification can reduce compilation time for some extremely long regexes.

Sometimes, performance improvements result from a combination of transformations. For example, consider the following optimization chain:

1. `^1$|^2$` — Initial
2. `^(?:1|2)$` — `extractPrefix`, `extractSuffix`
3. `^(?:[12])$` — `alternationToClass`
4. `^[12]$` — `unwrapUselessGroups`

This sequence of changes happens automatically, assuming none of the individual transforms have been disabled. Note that, although the `extractSuffix` transform doesn't typically impact performance on its own, its change helped enable removing alternation in the subsequent step, which reduces backtracking and can have a direct performance impact (in some cases, it can even eliminate ReDoS).

A real world example of performance improvements comes from [Better C++](https://github.com/jeff-hykin/better-cpp-syntax), which includes a large collection of complex Oniguruma regexes used for highlighting C++ code in VS Code, Shiki, and other tools. Despite having gone through multiple rounds of performance hand-tuning over the years (and despite not including known cases of catastophic backtracking, which could lead to even greater opportunities for performance optimization), running its regexes through this library resulted in a ~30% improvement in syntax highlighting performance. And this improvement wasn't specific to Oniguruma. Using [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es) to transpile the regexes (before and after optimization) to native JavaScript `RegExp`s showed a comparable ~30% performance boost for native JavaScript regex engines.

## Flags

Although the optimizer takes provided flags into account and includes a `flags` property on the returned object, it never changes top-level flags in ways that would change the meaning of the regex if you didn't provide the updated flags to Oniguruma. As a result, the optimized pattern can be used in situations when you aren't able to change flags. For example, the optimizer removes `x` from the returned flags (since its effects are always applied), but it doesn't add flags.

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

Contributions are welcome! Review this library's [contributing guide](https://github.com/slevithan/oniguruma-parser/blob/main/CONTRIBUTING.md), and use the following steps to add a new optimization transform:

- Add your optimization in a new file, e.g. `src/optimizer/transforms/foo.ts`.
- Import and list it in `src/optimizer/optimizations.ts`.
- Add tests in `test/optimizer/foo.test.ts`; run them via `pnpm test`.
- List it in this readme file with a simple example.

You don't need to do too much in one optimization, since optimizations can compliment each other. Ideas for new optimizations are collected [here](https://github.com/slevithan/oniguruma-parser/issues/7).

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors). Inspiration for the optimizer included [regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree), which includes an optimizer for JavaScript regexes.

If you want to support this project, I'd love your help by contributing improvements ([guide](https://github.com/slevithan/oniguruma-parser/blob/main/CONTRIBUTING.md)), sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

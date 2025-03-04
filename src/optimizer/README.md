# oniguruma-parser: Optimizer module

The optimizer transforms an Oniguruma pattern into an optimized version of itself.

Benefits:

- Optimized regexes are smaller; good for minification.
- Optimized regexes may be easier to read.
- Some optimizations may improve performance.

The optimizer isn't singly focused on minification, although that is its primary purpose. It attempts to optimize both pattern length and the performance of resulting regexes, while avoiding changes that might reduce the pattern length in some contexts but be problematic in others (e.g. by triggering edge case Oniguruma bugs). In rare cases, results might be slightly longer than the input.

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

Although the optimizer takes provided flags into account and includes a `flags` property on the returned object, it never changes top-level flags in ways that would change the meaning of the regex if you didn't provide the updated flags to Oniguruma. This is so that the optimized pattern can be used in situations where you aren't able to change the provided flags. So, for example, it removes `x` from top-level flags (since its effects are always applied), but it doesn't add flags.

## Optimizations

### Always on

The following optimizations are always enabled. They result from the nature of the parser, which builds an AST.

| Description | Example |
|-|-|
| Remove comment groups | `(?#comment)a` → `a` |
| Remove free-spacing and line comments with flag `x` | `(?x) a b` → `ab` |
| Remove duplicate flags in mode modifiers | `(?ii-m-m)` → `(?i-m)` |
| Normalize Unicode property names | `\p{-IDS- TART}` → `\p{ID_Start}` |
| Resolve relative backreference/subroutine numbers | `()\k<-1>` → `()\k<1>` |

### On by default

Some of the following optimizations (related to the representation of tokens) don't yet have names because, currently, they're always enabled. They will be optional in future versions (see [issue](https://github.com/slevithan/oniguruma-parser/issues/1)).

<table>
  <tr>
    <th></th>
    <th>Optimization name</th>
    <th>Description</th>
    <th>Example</th>
  </tr>
  <tr>
    <th rowspan="3" valign="top">
      Characters
    </th>
    <td><code></code></td>
    <td>Remove unnecessary escapes</td>
    <td><code>\![\?]</code> → <code>![?]</code></td>
  </tr>
  <tr>
    <td><code></code></td>
    <td>Use the simplest character representation</td>
    <td><code>\u0061</code> → <code>a</code></td>
  </tr>
  <tr>
    <td><code></code></td>
    <td>Remove leading zeros from enclosed character escapes</td>
    <td><code>\x{0061}</code> → <code>\x{61}</code></td>
  </tr>
  <tr>
    <th rowspan="2" valign="top">
      Character sets
    </th>
    <td><code>useUnicodeAliases</code></td>
    <td>Use Unicode property aliases</td>
    <td><code>\p{ID_Start}</code> → <code>\p{IDS}</code></td>
  </tr>
  <tr>
    <td><code></code></td>
    <td>Use outer negation for Unicode properties</td>
    <td><code>\p{^L}</code> → <code>\P{L}</code></td>
  </tr>
  <tr>
    <th rowspan="4" valign="top">
      Character<br>classes
    </th>
    <td><code>unwrapUselessClasses</code></td>
    <td>Unwrap outermost character classes containing a single character or character set</td>
    <td><code>[\s]</code> → <code>\s</code></td>
  </tr>
  <tr>
    <td><code>unnestUselessClasses</code></td>
    <td>Unnest non-negated, non-intersection character classes</td>
    <td><code>[a[b]]</code> → <code>[ab]</code></td>
  </tr>
  <tr>
    <td><code>unnestOnlyChildClasses</code></td>
    <td>Unnest character classes that are an only-child of a character class</td>
    <td><code>[^[^a]]</code> → <code>[a]</code></td>
  </tr>
  <tr>
    <td><code>dedupeClasses</code></td>
    <td>Remove duplicate characters, sets, and ranges from character classes</td>
    <td><code>[a\x61]</code> → <code>[a]</code></td>
  </tr>
  <tr>
    <th rowspan="2" valign="top">
      Groups
    </th>
    <td><code>removeEmptyGroups</code></td>
    <td>Remove empty noncapturing, atomic, and flag groups, even if quantified</td>
    <td><code>(?:)a</code> → <code>a</code></td>
  </tr>
  <tr>
    <td><code>unwrapUselessGroups</code></td>
    <td>Unwrap nonbeneficial noncapturing, atomic, and flag groups</td>
    <td><code>(?:a)</code> → <code>a</code></td>
  </tr>
  <tr>
    <th rowspan="2" valign="top">
      Quantifiers
    </th>
    <td><code></code></td>
    <td>Use symbols for quantifier ranges when possible</td>
    <td><code>a{1,}</code> → <code>a+</code></td>
  </tr>
  <tr>
    <td><code></code></td>
    <td>Remove leading zeros from quantifier ranges</td>
    <td><code>a{01,03}</code> → <code>a{1,3}</code></td>
  </tr>
  <tr>
    <th rowspan="1" valign="top">
      Alternation
    </th>
    <td><code>alternationToClass</code> 🚀</td>
    <td>Use character classes for adjacent alternatives with single-length values</td>
    <td><code>a|b|\d</code> → <code>[ab\d]</code></td>
  </tr>
  <tr>
    <th rowspan="2" valign="top">
      Backrefs and<br>subroutines
    </th>
    <td><code></code></td>
    <td>Unenclose numbered backreferences</td>
    <td><code>()\k&lt;1></code> → <code>()\1</code></td>
  </tr>
  <tr>
    <td><code></code></td>
    <td>Remove leading zeros from backreference/subroutine numbers</td>
    <td><code>()\k&lt;01></code> → <code>()\k&lt;1></code></td>
  </tr>
</table>

🚀 = Can improve performance and reduce risk of ReDoS.

Optimizations are applied in a loop until no further optimization progress is made. Individual optimization transforms are typically narrow and work best when combined with other optimizations.

Many additional optimizations are possible and will be added in future versions.

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

## About

Created by [Steven Levithan](https://github.com/slevithan). If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

Inspiration for the optimizer module included [regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree), which includes an optimizer for JavaScript regexes.

MIT License.

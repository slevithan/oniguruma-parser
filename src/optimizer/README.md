# oniguruma-parser: Optimizer module

The optimizer transforms an Oniguruma pattern into an optimized version of itself.

Benefits:

- Optimized regexes are smaller; good for minification.
- Optimized regexes may be easier to read.
- Some optimizations may improve performance.

The optimizer takes provided flags into account but it doesn't change top-level flags so that the optimized pattern can be used in situations where you are not able to change the provided flags. The exception is flag `x`, which is always removed since its effects are always applied to the generated pattern.

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
| Remove leading zeros from backreference/subroutine numbers | `()\k<01>` → `()\k<1>` |
| Remove leading zeros from enclosed character escapes | `\x{0061}` → `\x{61}` |
| Remove leading zeros from quantifier ranges | `a{01,03}` → `a{1,3}` |

### On by default

Some of the following optimizations (related to the representation of tokens) don't yet have names because they're currently always enabled. They will be optional in future versions (see [issue](https://github.com/slevithan/oniguruma-parser/issues/1)).

|  Optimization name | Description | Example |
|-|-|-|
| | Remove unnecessary escapes | `\![\?]` → `![?]` |
| | Use the simplest character representation | `\u0061` → `a` |
| | Use outer negation for Unicode properties | `\p{^L}` → `\P{L}` |
| | Use symbols for quantifier ranges when possible | `a{1,}` → `a+` |
| | Unenclose numbered backreferences | `()\k<1>` → `()\1` |
| `removeEmptyGroups` | Remove empty noncapturing, atomic, and flag groups, even if quantified | `(?:)a` → `a` |
| `unwrapUselessGroups` | Unwrap nonbeneficial noncapturing, atomic, and flag groups | `(?:a)` → `a` |
| `unwrapUselessClasses` | Unwrap outermost character classes containing a single character or character set | `[\s]` → `\s` |
| `unnestUselessClasses` | Unnest non-negated character classes that don't contain intersection | `[a[b]]` → `[ab]` |
| `unnestOnlyChildClasses` | Unnest character classes that are an only-child of a character class | `[^[^a]]` → `[a]` |

Optimizations are applied in a loop until no further optimization progress is made.

Many additional optimizations are possible and will be added in future versions.

## Disable specific optimizations

```js
import {optimize} from 'oniguruma-parser/optimizer';

const pattern = '...';
const optimized = optimize(pattern, {
  override: {
    // Disable specific optimizations by name
    removeEmptyGroups: false,
  },
});
```

## Enable only specific (optional) optimizations

```js
import {optimize, getAllOptimizations} from 'oniguruma-parser/optimizer';

const pattern = '...';
const optimized = optimize(pattern, {
  override: {
    ...getAllOptimizations({disable: true}),
    // Enable only specific optimizations by name
    removeEmptyGroups: true,
  },
});
```

## About

Created by [Steven Levithan](https://github.com/slevithan). If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

The optimizer module was partly inspired by [regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree), which includes an optimizer for JavaScript regexes.

MIT License.

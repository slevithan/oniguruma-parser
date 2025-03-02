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

The following optimizations result from the nature of the parser, which builds an AST. They can't be disabled.

| Description | Example |
|-|-|
| Remove comment groups | `(?#comment)a` → `a` |
| Remove free-spacing and line comments with flag `x` | `(?x) a b` → `ab` |
| Remove duplicate flags in mode modifiers | `(?ii-m-m)` → `(?i-m)` |
| Normalize Unicode property names | `\p{-IDS- TART}` → `\p{ID_Start}` |

The following optimizations are currently always enabled, but future versions will make them on-by-default but optional.

| Description | Example |
|-|-|
| Remove unnecessary escapes | `\![\?]` → `![?]` |
| Normalize char codes | `\u0061` → `a` |
| Normalize negation for Unicode properties | `\p{^L}` → `\P{L}` |
| Normalize quantifier ranges | `a{1,}` → `a+` |

### On by default

Optimizations are applied in a loop until no further optimization progress is made.

|  Optimization name | Description | Example |
|-|-|-|
| `removeEmptyGroups` | Remove empty noncapturing, atomic, and flag groups, even if quantified | `(?:)a` → `a` |
| `unwrapUselessGroups` | Unwrap nonbeneficial noncapturing, atomic, and flag groups | `(?:a)` → `a` |
| `unwrapUselessClasses` | Unwrap outermost character classes containing a single character or character set | `[\s]` → `\s` |
| `unnestUselessClasses` | Unnest non-negated character classes that don't contain intersection | `[a[b]]` → `[ab]` |
| `unnestOnlyChildClasses` | Unnest character classes that are an only-child of a character class | `[^[^a]]` → `[a]` |

Many additional optimizations are possible and will be added in future versions.

## Disable specific optimizations

```js
import {optimize} from 'oniguruma-parser/optimizer';

const pattern = '...';
optimize(pattern, {
  override: {
    // Disable specific optimizations by name
    removeEmptyGroups: false,
  },
});
```

## Enable only specific optimizations

```js
import {optimize, getAllOptimizations} from 'oniguruma-parser/optimizer';

const pattern = '...';
optimize(pattern, {
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

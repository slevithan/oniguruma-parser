# oniguruma-parser: Optimizer module

The optimizer transforms an Oniguruma pattern into an optimized version of itself.

Advantages:

- Optimized regexes are smaller; good for minification.
- Optimized regexes may be easier to read.
- Some optimizations may improve performance.

Transforms are applied in a loop until no further optimization progress is made.

The optimizer takes provided flags into account but it doesn't change top-level flags so that the optimized pattern can be used in situations where you are not able to change the provided flags. The exception is flag `x`, which is always removed since its effects are always applied to the generated pattern.

```ts
function optimize(
  pattern: string;
  options?: {
    allow?: Array<OptimizationName>;
    flags?: string;
    rules?: {
      captureGroup?: boolean;
      singleline?: boolean;
    };
  }
): {
  pattern: string;
  flags: string;
}
```

## Optimizations

### Always on

| Description | Example |
|-|-|
| Remove comment groups | `(?#comment)a` → `a` |
| Remove free-spacing and line comments with flag `x` | `(?x) a b` → `ab` |
| Remove duplicate flags in mode modifiers | `(?ii-m-m)` → `(?i-m)` |
| Normalize Unicode property names | `\p{-IDS- TART}` → `\p{ID_Start}` |

The following optimizations are currently always enabled, but future versions will allow excluding them by providing an `allow` list:

| Description | Example |
|-|-|
| Remove unnecessary escapes | `\![\?]` → `![?]` |
| Normalize char codes | `\u0061` → `a` |
| Normalize negation for Unicode properties | `\p{^L}` → `\P{L}` |
| Normalize quantifier ranges | `a{1,}` → `a+` |

### On by default

The following optimizations are enabled by default, but can be excluded by providing an `allow` list:

|  Transform name | Description | Example |
|-|-|-|
| `removeEmptyGroups` | Remove empty noncapturing, atomic, and flag groups, plus any attached quantifiers | `(?:)a` → `a` |
| `unwrapGroups` | Unwrap unnecessary groups | `(?:a)` → `a` |
| `unwrapClasses` | Unwrap unnecessary character classes, not including nested classes | `[a]` → `a` |

Additional optimizations will be added in future versions.

## About

The optimizer module was partly inspired by [regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree), which includes an optimizer for JavaScript regexes.

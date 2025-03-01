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

## Transforms

### Base

The following transforms are always enabled:

| Description | Example |
|-|-|
| Remove comment groups | `(?#comment)a` → `a` |
| Remove free-spacing and line comments with flag `x` | `(?x) a b` → `ab` |

Currently, the following transforms are always enabled, but future versions will allow excluding them via the `allow` list:

| Description | Example |
|-|-|
| Normalize char codes | `\u0061` → `a` |
| Normalize quantifier ranges | `a{1,}` → `a+` |
| Normalize Unicode property names | `\p{-IDS- TART}` → `\p{ID_Start}` |
| Normalize negation for Unicode properties | `\p{^L}` → `\P{L}` |
| Remove unnecessary escapes | `\![\?]` → `![?]` |
| Remove duplicate flags in mode modifiers | `(?ii-m-m)` → `(?i-m)` |

### On by default

The following transforms are enabled by default, but can be excluded by providing an `allow` list:

|  Transform name | Description | Example |
|-|-|-|
| `removeEmptyGroups` | Remove empty noncapturing, atomic, and flag groups, plus any attached quantifiers | `(?:)a` → `a` |
| `ungroup` | Remove unnecessary nested groups | `(?:(?>a))` → `(?>a)` |

Additional transforms will be added in future versions.

## About

Inspiration for the optimizer included [regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree), which includes an optimizer for JavaScript regexes.

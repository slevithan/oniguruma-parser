# oniguruma-parser: Optimizer module

> The optimizer is coming soon.

The optimizer transforms an Oniguruma pattern into an optimized version of it.

Advantages:

- Optimized regexes are smaller; good for minification.
- Optimized regexes may be easier to read.
- Some optimizations may improve performance.

Transforms are applied in a loop until no further optimization progress is made.

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

The optimizer was inspired by [regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree), which includes an optimizer for JavaScript regexes.

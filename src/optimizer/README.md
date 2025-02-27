# oniguruma-parser: Optimizer module

The optimizer transforms an Oniguruma AST into an optimized version, which can then be passed to the generator to get back an optimized Oniguruma regex pattern.

Advantages:

- Optimized regexes are smaller; good for minification.
- Optimized regexes may be easier to read.
- Some optimizations may improve performance.

The optimizer was inspired by [regexp-tree](https://github.com/DmitrySoshnikov/regexp-tree), which includes an optimizer for JavaScript regexes.

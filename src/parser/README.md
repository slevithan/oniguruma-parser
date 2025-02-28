# oniguruma-parser: Parser module

Parses Oniguruma pattern and flags strings into an AST.

Typically, it's recommended to use `toOnigurumaAst` from the [main module](https://github.com/slevithan/oniguruma-parser) rather than using the parser directly. However, the parser exports additional constants, functions, and types, and it accepts additional options that might be needed in some cases.

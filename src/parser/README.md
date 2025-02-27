# oniguruma-parser: Parser module

Parses a set of Oniguruma regex [tokens](https://github.com/slevithan/oniguruma-parser/tree/main/src/tokenizer) into an AST.

Typically, it's recommended to use `toOnigurumaAst` from the [main module](https://github.com/slevithan/oniguruma-parser) since it's easier to use and it accepts Oniguruma pattern and flags strings rather than output from the tokenizer. However, the parser module provides more options that might be needed by some tools, and it exports additional constants, functions, and types.

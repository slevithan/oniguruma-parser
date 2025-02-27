# oniguruma-parser: Tokenizer module

Converts an Oniguruma regex string to a list of tokens that can be converted to an AST by the [parser](https://github.com/slevithan/oniguruma-parser/tree/main/src/parser).

It's not recommended to work with this list of tokens directly, as tokenization is considered an implementation detail of the parser and changes might be made to the token format in new releases without following semver.

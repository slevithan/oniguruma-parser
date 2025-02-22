# `oniguruma-parser`

This library was initially built for [Oniguruma-To-ES](https://github.com/slevithan/oniguruma-to-es). It can be used wherever you want to generate, validate, or traverse ASTs for Oniguruma regular expressions.

The primary function of this library is `toOnigurumaAst`, which returns an Oniguruma AST generated from an Oniguruma pattern.

```ts
function toOnigurumaAst(
  pattern: string,
  options?: {
    flags?: string;
    rules?: {
      captureGroup?: boolean;
      singleline?: boolean;
    };
  }
): OnigurumaAst;
```

An error is thrown if the pattern isn't valid in Oniguruma.

Some things to be aware of:

- It's nearly but [not fully](https://github.com/slevithan/oniguruma-to-es#-unsupported-features) complete in its support of Oniguruma syntax. Contributions are welcome to add the few remaining pieces.
- It's designed to be lightweight for use in browsers, so it doesn't currently include the list of Unicode script and block names. Thus it can't determine most invalid Unicode property names.
  - It does know that Unicode "properties of strings" names are invalid.
  - It does normalize property names, and knows the list of supported POSIX, binary property, and general category names and aliases (so it can do perfect rather than just best-effort normalization on those).
  - It would be easy to add an extra layer of validation on this if you wanted to provide your own data and throw for any Unicode property names not supported by Oniguruma. Future versions of this library will provide this data in a tree-shakable way.

Additional exports are available that provide access to the tokenizer, parser, traverser, etc.

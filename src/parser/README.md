# `oniguruma-parser`: Parser module

Accepts an Oniguruma pattern, flags, and compile-time options (along with options specific to this library), and returns an AST.

Typically, it's recommended to use `toOnigurumaAst` from the [root module](https://github.com/slevithan/oniguruma-parser) rather than using the parser module directly. However, the parser exports additional constants, functions, and types that you might need when transforming an AST, and it accepts additional options that might be needed in some cases.

> It might be preferable to use the parser directly if bundle size is a concern, since it doesn't automatically include Unicode property name data used for validation and normalization. After tree shaking, `parse` is 6.9 kB minzipped vs `toOnigurumaAst`'s 11.3 kB, as of `oniguruma-parser` v0.6.2.

## Import

```js
import {parse} from 'oniguruma-parser/parser';
```

## Type definition

```ts
function parse(
  pattern: string,
  options?: {
    flags?: string;
    normalizeUnknownPropertyNames?: boolean;
    rules?: {
      captureGroup?: boolean;
      singleline?: boolean;
    };
    skipBackrefValidation?: boolean;
    skipLookbehindValidation?: boolean;
    skipPropertyNameValidation?: boolean;
    unicodePropertyMap?: Map<string, string> | null;
  }
): OnigurumaAst;
```

The Unicode property map automatically provided to `parse` by `toOnigurumaAst` is available via `import {OnigUnicodePropertyMap} from 'oniguruma-parser/unicode'`.

## About

Created by [Steven Levithan](https://github.com/slevithan). If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

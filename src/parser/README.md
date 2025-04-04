# Parser module: `oniguruma-parser/parser`

Includes the `parse` function which accepts an Oniguruma pattern, flags, and compile-time options (along with options specific to this library), and returns an AST. Compared to `toOnigurumaAst` from the [root module](https://github.com/slevithan/oniguruma-parser) (which is often easier to use), `parse` includes additional options for specialized use.

The parser module also exports numerous functions and types that you might need when [traversing](https://github.com/slevithan/oniguruma-parser/blob/main/src/traverser/README.md) and transforming an AST.

> It might be preferable to use the parser directly if bundle size is a concern, since it doesn't automatically include Unicode property name data used for validation and normalization. After tree shaking, `parse` is 6.5 kB minzipped vs `toOnigurumaAst`'s 10.9 kB, as of `oniguruma-parser` v0.8.0.

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

> **Note:** The Unicode property map automatically provided to `parse` by `toOnigurumaAst` is available via `import {OnigUnicodePropertyMap} from 'oniguruma-parser/unicode'`.

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors).

If you want to support this project, I'd love your help by contributing improvements ([guide](https://github.com/slevithan/oniguruma-parser/blob/main/CONTRIBUTING.md)), sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

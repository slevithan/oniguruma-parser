# Parser module 🌿<br>`oniguruma-parser/parser`

Includes the `parse` function which accepts an Oniguruma pattern, flags, and compile-time options (along with options specific to this library), and returns an AST. Compared to the `toOnigurumaAst` wrapper from the [root module](https://github.com/slevithan/oniguruma-parser), `parse` includes additional options for specialized use, but `toOnigurumaAst` is often easier to use since it automatically provides the appropriate Unicode property data.

> **Note:** The Unicode property data provided by `toOnigurumaAst` is available via `import {OnigUnicodePropertyMap} from 'oniguruma-parser/unicode'`.

The parser module also exports numerous functions and types that might be helpful when [traversing](https://github.com/slevithan/oniguruma-parser/blob/main/src/traverser/README.md) and transforming an AST.

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

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors).

If you want to support this project, I'd love your help by contributing improvements ([guide](https://github.com/slevithan/oniguruma-parser/blob/main/CONTRIBUTING.md)), sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

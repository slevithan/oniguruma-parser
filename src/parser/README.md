# Parser module 🌲<br>`oniguruma-parser/parser`

This module's `parse` function accepts an Oniguruma pattern with optional flags and other options, and returns an AST. This module also exports numerous functions and types that can be used when [traversing](https://github.com/slevithan/oniguruma-parser/blob/main/src/traverser/README.md), transforming, or manually creating an AST.

> [!NOTE]
> Compared to the `toOnigurumaAst` wrapper from the [root module](https://github.com/slevithan/oniguruma-parser), `parse` includes additional options for specialized use, but `toOnigurumaAst` is often easier to use since it automatically provides the appropriate Unicode property validation data. The data is available by importing `OnigUnicodePropertyMap` from `'oniguruma-parser/unicode'`.

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

# Generator module ↩️<br>`oniguruma-parser/generator`

Generates Oniguruma pattern and flags strings from an `OnigurumaAst`.

## Import

```js
import {generate} from 'oniguruma-parser/generator';
```

## Type definition

```ts
function generate(ast: OnigurumaAst): {
  pattern: string;
  flags: string;
};
```

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors).

If you want to support this project, I'd love your help by contributing improvements ([guide](https://github.com/slevithan/oniguruma-parser/blob/main/CONTRIBUTING.md)), sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

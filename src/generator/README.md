# `oniguruma-parser`: Code generator module

Generates an Oniguruma pattern and flags from an AST.

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

If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

MIT License.

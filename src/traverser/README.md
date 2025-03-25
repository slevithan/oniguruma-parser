# `oniguruma-parser`: Traverser module

Provides a traversal API (using the vistor pattern) for Oniguruma regex ASTs.

## Import

```js
import {traverse} from 'oniguruma-parser/traverser';
```

## Type definition

```ts
function traverse(
  ast: OnigurumaAst,
  visitor: {
    [key in ('*' | NodeType)]?: Transformer | {
      enter?: Transformer;
      exit?: Transformer;
    };
  },
  state?: {
    [key: string]: any;
  }
): void;
```

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors).

If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

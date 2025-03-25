# `oniguruma-parser`: Traverser module

Provides a traversal API (using the vistor pattern) for Oniguruma regex ASTs. Useful for modifying ASTs.

## Import

```js
import {traverse} from 'oniguruma-parser/traverser';
```

## Type definition

```ts
function traverse(
  ast: OnigurumaAst,
  visitor: Visitor,
  state?: State
): void;

type Visitor = {
  [key in ('*' | NodeType)]?: VisitorNode | {
    enter?: VisitorNode;
    exit?: VisitorNode;
  };
};

type VisitorNode = (path: Path, state: State) => void;

type State = {
  [key: string]: any;
} | null;
```

> **Note:** `VisitorNode() {…}` is shorthand for `VisitorNode: {enter() {…}}`.

## Examples

### Add a `parent` property to every node

```js
traverse(ast, {
  '*'({node, parent}) {
    node.parent = parent;
  },
});
```

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors).

If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

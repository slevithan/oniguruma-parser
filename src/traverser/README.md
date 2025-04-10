# Traverser module: `oniguruma-parser/traverser`

Provides a traversal and transformation API (using the vistor pattern) for Oniguruma regex ASTs.

## Import

```js
import {traverse} from 'oniguruma-parser/traverser';
```

## Type definition

```ts
function traverse<State extends object | null = null>(
  root: OnigurumaAst,
  visitor: Visitor<State>,
  state: State | null = null
): OnigurumaAst;

type Visitor<State extends object | null = null> = {
  [N in Node as N['type']]?: VisitorNodeFn<Path<N>, State> | {
    enter?: VisitorNodeFn<Path<N>, State>;
    exit?: VisitorNodeFn<Path<N>, State>;
  };
} & {
  '*'?: VisitorNodeFn<Path<Node>, State> | {
    enter?: VisitorNodeFn<Path<Node>, State>;
    exit?: VisitorNodeFn<Path<Node>, State>;
  };
};

type VisitorNodeFn<P, State> = (path: P, state: State) => void;
```

- `VisitorNodeFn() {…}` is shorthand for `VisitorNodeFn: {enter() {…}}`.
- Provided `state` is passed through to all visitor node functions.
- Type `Path` contains a variety of properties (`node`, `parent`, etc.) and methods (`remove`, `replaceWith`, etc.).

## Examples

> **Note:** For additional examples, check out the [optimizer](https://github.com/slevithan/oniguruma-parser/blob/main/src/optimizer/README.md)'s list of [optimization transforms](https://github.com/slevithan/oniguruma-parser/tree/main/src/optimizer/transforms).

### Add a `parent` property to every node

```js
import {toOnigurumaAst} from 'oniguruma-parser';
import {traverse} from 'oniguruma-parser/traverser';

const ast = toOnigurumaAst('^.');
traverse(ast, {
  '*'({node, parent}) {
    node.parent = parent;
  },
});
```

### Swap all `a` and `.` nodes

```js
import {toOnigurumaAst} from 'oniguruma-parser';
import {createCharacter, createCharacterSet} from 'oniguruma-parser/parser';
import {traverse} from 'oniguruma-parser/traverser';

const charCode = 'a'.codePointAt(0);
const ast = toOnigurumaAst('a.');
traverse(ast, {
  Character({node, replaceWith}) {
    if (node.value === charCode) {
      replaceWith(createCharacterSet('dot'));
    }
  },
  CharacterSet({node, replaceWith}) {
    if (node.kind === 'dot') {
      replaceWith(createCharacter(charCode));
    }
  },
});
```

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors).

If you want to support this project, I'd love your help by contributing improvements ([guide](https://github.com/slevithan/oniguruma-parser/blob/main/CONTRIBUTING.md)), sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

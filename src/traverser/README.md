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

type State = {[key: string]: any};
```

> **Note:** `VisitorNode() {…}` is shorthand for `VisitorNode: {enter() {…}}`. Type `Path` contains a variety of properties (`node`, `parent`, etc.) and methods (`remove`, `replaceWith`, etc.).

## Examples

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

If you want to support this project, I'd love your help by contributing improvements, sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

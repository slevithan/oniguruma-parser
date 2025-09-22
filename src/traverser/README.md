# Traverser module 🌀<br>`oniguruma-parser/traverser`

Provides a traversal and transformation API (using the vistor pattern) for `OnigurumaAst` objects created by this library.

## Contents

- [Import](#import)
- [Details](#details)
- [Node types](#node-types)
- [Path](#path)

## Import

```js
import {traverse} from 'oniguruma-parser/traverser';
```

## Details

The `traverse` function takes three arguments:

1. `root`: Usually an `OnigurumaAst`, but can also be a midpoint in an AST.
2. `visitor`: An object with node types as keys, and functions as values. These visitor node type functions can transform the AST in-place.
3. `state`: *Optional.* Any non-primitive value, or `null`. It's passed to all of the visitor's node type functions as their second argument.

The `root` argument is returned. It might have been modified by the visitor's node type functions.

> **Note:** The full description of the `traverse` function's types is complex. Refer to `traverse.ts` if needed.

The visitor's keys can be any node type (ex: `CapturingGroup`) or `'*'`. Their values can be either functions that accept arguments `path` and `state`, or objects with `enter` and/or `exit` methods (that offer more control over when the functions run during traversal).

The `path` argument contains a variety of properties (`node`, `parent`, etc.) and methods (`remove`, `replaceWith`, etc.).

For example, to add a `parent` property to every node:

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

Or, to swap all `a` and `.` nodes:

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

> **Note:** `NodeType() {…}` is shorthand for `NodeType: {enter() {…}}`.

> **Note:** For additional examples, check out the [optimizer](https://github.com/slevithan/oniguruma-parser/blob/main/src/optimizer/README.md)'s list of [optimization transforms](https://github.com/slevithan/oniguruma-parser/tree/main/src/optimizer/transforms).

## Node types

- `*`: Specific to the traverser; used to visit any node type
- `AbsenceFunction`
- `Alternative`
- `Assertion`
- `Backreference`
- `CapturingGroup`
- `Character`
- `CharacterClass`
- `CharacterClassRange`
- `CharacterSet`
- `Directive`
- `Flags`
- `Group`
- `LookaroundAssertion`
- `NamedCallout`
- `Quantifier`
- `Regex`: The root node
- `Subroutine`

Many node types are subdivided by other properties; especially `kind`. Types for each node type are defined in the [parser module](https://github.com/slevithan/oniguruma-parser/blob/main/src/parser/README.md).

## Path

> **Note:** Refer to `traverse.ts` for more details.

### Properties

- `node`
- `parent`
- `key`
- `container`
- `root`

### Methods

- `remove`
- `removeAllNextSiblings`
- `removeAllPrevSiblings`
- `replaceWith`
- `replaceWithMultiple`
- `skip`

## About

Created by [Steven Levithan](https://github.com/slevithan) and [contributors](https://github.com/slevithan/oniguruma-parser/graphs/contributors).

If you want to support this project, I'd love your help by contributing improvements ([guide](https://github.com/slevithan/oniguruma-parser/blob/main/CONTRIBUTING.md)), sharing it with others, or [sponsoring](https://github.com/sponsors/slevithan) ongoing development.

MIT License.

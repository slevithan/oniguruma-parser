import type {AlternativeElementNode, AlternativeNode, CharacterClassElementNode, Node, ParentNode, RegexNode} from '../parser/parse.js';
import {throwIfNullish} from '../utils.js';

type ContainerElementNode =
  // Used within the `body` container of any `AlternativeContainerNode`
  AlternativeNode |
  // Any node type used within the `body` container of an `AlternativeNode`
  AlternativeElementNode |
  // Any node type used within the `body` container of a `CharacterClassNode`
  CharacterClassElementNode;

type Path<N = Node, Root = RegexNode> = {
  // The current node being traversed
  node: N;
  // Parent node of the current node
  parent: N extends RegexNode ? null : ParentNode;
  // String property where the current node in held by the parent node, or numeric index in the
  // parent's `container` array
  key: N extends RegexNode ? null : number | string;
  // Container array holding the current node in the parent node; `null` if the parent isn't a type
  // that contains a list of nodes
  container: N extends RegexNode ? null : Array<ContainerElementNode> | null;
  // Starting node of the AST being traversed; usually a `RegexNode` but can be any node type if
  // traversing from a midpoint
  root: Root;
  // Removes the current node; its kids won't be traversed
  remove: () => void;
  // Removes all siblings to the right of the current node, without traversing them; returns the
  // removed nodes
  removeAllNextSiblings: () => Array<Node>;
  // Removes all siblings to the left of the current node, which have already been traversed;
  // returns the removed nodes
  removeAllPrevSiblings: () => Array<Node>;
  // Replaces the current node with a new node; kids of the replaced node won't be traversed;
  // optionally traverses the new node
  replaceWith: (newNode: Node, options?: {traverse?: boolean}) => void;
  // Replaces the current node with multiple new nodes; kids of the replaced node won't be
  // traversed; optionally traverses the new nodes
  replaceWithMultiple: (newNodes: Array<Node>, options?: {traverse?: boolean}) => void;
  // Skips traversing kids of the current node
  skip: () => void;
};

// `VisitorNodeFn() {…}` is shorthand for `VisitorNodeFn: {enter() {…}}`.
type Visitor<State extends object | null = null, Root extends Node = RegexNode> = {
  [N in Node as N['type']]?: VisitorNodeFn<Path<N, Root>, State> | {
    enter?: VisitorNodeFn<Path<N, Root>, State>;
    exit?: VisitorNodeFn<Path<N, Root>, State>;
  };
} & {
  '*'?: VisitorNodeFn<Path<Node, Root>, State> | {
    enter?: VisitorNodeFn<Path<Node, Root>, State>;
    exit?: VisitorNodeFn<Path<Node, Root>, State>;
  };
};

type VisitorNodeFn<P, State> = (path: P, state: State) => void;

/**
Traverses an AST and calls the provided `visitor`'s node function for each node. Returns the same
object, possibly modified.

Visitor node functions can modify the AST in place and use methods on the `path` (provided as their
first argument) to help modify the AST. Provided `state` is passed through to all visitor node
functions as their second argument.

Visitor node functions are called in the following order:
1. `enter` function of the `'*'` node type (if any)
2. `enter` function of the given node's type (if any)
3. [The node's kids (if any) are traversed recursively, unless `skip` is called]
4. `exit` function of the given node's type (if any)
5. `exit` function of the `'*'` node type (if any)
*/
function traverse<State extends object | null = null, Root extends Node = RegexNode>(
  root: Root,
  visitor: Visitor<State, Root>,
  state: State | null = null
): Root {
  function traverseArray(array: NonNullable<Path['container']>, parent: Path['parent']) {
    for (let i = 0; i < array.length; i++) {
      const keyShift = traverseNode(array[i], parent, i, array);
      i = Math.max(-1, i + keyShift);
    }
  }
  function traverseNode(
    node: Path['node'],
    parent: Path['parent'] = null,
    key: Path['key'] = null,
    container: Path['container'] = null
  ): number {
    let keyShift = 0;
    let skipTraversingKidsOfPath = false;
    const path: Path = {
      node,
      parent,
      key,
      container,
      root: root as RegexNode,
      remove() {
        arrayContainer(container).splice(Math.max(0, numericKey(key) + keyShift), 1);
        keyShift--;
        skipTraversingKidsOfPath = true;
      },
      removeAllNextSiblings() {
        return arrayContainer(container).splice(numericKey(key) + 1);
      },
      removeAllPrevSiblings() {
        const shifted = numericKey(key) + keyShift;
        keyShift -= shifted;
        return arrayContainer(container).splice(0, Math.max(0, shifted));
      },
      replaceWith(newNode, options = {}) {
        const traverseNew = !!options.traverse;
        if (container) {
          container[Math.max(0, numericKey(key) + keyShift)] = newNode as ContainerElementNode;
        } else {
          // `key` will be one of:
          // - For `CharacterClassRangeNode`: 'min', 'max'
          // - For `QuantifierNode`: 'body'
          // - For `RegexNode`: 'flags'
          // @ts-expect-error
          throwIfNullish(parent, `Can't replace root node`)[key as string] = newNode;
        }
        if (traverseNew) {
          traverseNode(newNode, parent, key, container);
        }
        skipTraversingKidsOfPath = true;
      },
      replaceWithMultiple(newNodes, options = {}) {
        const traverseNew = !!options.traverse;
        arrayContainer(container).splice(Math.max(0, numericKey(key) + keyShift), 1, ...newNodes);
        keyShift += newNodes.length - 1;
        if (traverseNew) {
          let keyShiftInLoop = 0;
          for (let i = 0; i < newNodes.length; i++) {
            keyShiftInLoop += traverseNode(newNodes[i], parent, numericKey(key) + i + keyShiftInLoop, container);
          }
        }
        skipTraversingKidsOfPath = true;
      },
      skip() {
        skipTraversingKidsOfPath = true;
      },
    };

    const {type} = node;
    const anyTypeVisitor = visitor['*'];
    const thisTypeVisitor = visitor[type];
    const enterAllFn = typeof anyTypeVisitor === 'function' ? anyTypeVisitor : anyTypeVisitor?.enter;
    const enterThisFn = typeof thisTypeVisitor === 'function' ? thisTypeVisitor : thisTypeVisitor?.enter;
    // Type args are too complex to avoid TS errors here, but `VisitorNodeFn`s get correct types
    // @ts-expect-error
    enterAllFn?.(path, state);
    // @ts-expect-error
    enterThisFn?.(path, state);

    if (!skipTraversingKidsOfPath) {
      switch (type) {
        case 'AbsenceFunction':
        case 'Alternative':
        case 'CapturingGroup':
        case 'CharacterClass':
        case 'Group':
        case 'LookaroundAssertion':
          traverseArray(node.body, node);
          break;
        case 'Assertion':
        case 'Backreference':
        case 'Character':
        case 'CharacterSet':
        case 'Directive':
        case 'Flags':
        case 'NamedCallout':
        case 'Subroutine':
          break;
        case 'CharacterClassRange':
          traverseNode(node.min, node, 'min');
          traverseNode(node.max, node, 'max');
          break;
        case 'Quantifier':
          traverseNode(node.body, node, 'body');
          break;
        case 'Regex':
          traverseArray(node.body, node);
          traverseNode(node.flags, node, 'flags');
          break;
        default:
          throw new Error(`Unexpected node type "${type}"`);
      }
    }

    // @ts-expect-error
    (thisTypeVisitor as Exclude<typeof thisTypeVisitor, Function>)?.exit?.(path, state);
    // @ts-expect-error
    (anyTypeVisitor as Exclude<typeof anyTypeVisitor, Function>)?.exit?.(path, state);
    return keyShift;
  }
  traverseNode(root);
  return root;
}

function arrayContainer(value: unknown): Array<Node> {
  if (!Array.isArray(value)) {
    throw new Error('Container expected');
  }
  return value;
}

function numericKey(value: unknown): number {
  if (typeof value !== 'number') {
    throw new Error('Numeric key expected');
  }
  return value;
}

export {
  type Path,
  type Visitor,
  traverse,
};

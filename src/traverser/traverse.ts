import {NodeTypes} from '../parser/parse.js';
import type {Node, NodeType, OnigurumaAst, RegexNode} from '../parser/parse.js';

type Path = {
  node: Node;
  parent: Node | null;
  key: number | string | null;
  container: Array<Node> | null;
  root: RegexNode; // Same as `OnigurumaAst`
  remove: () => void;
  removeAllNextSiblings: () => Array<Node>;
  removeAllPrevSiblings: () => Array<Node>;
  replaceWith: (newNode: Node, options?: {traverse?: boolean}) => void;
  replaceWithMultiple: (newNodes: Array<Node>, options?: {traverse?: boolean}) => void;
  skip: () => void;
};
type State = {[key: string]: any} | null;
type Transformer = (path: Path, state: State) => void;
type Visitor = {
  [key in ('*' | NodeType)]?: Transformer | {
    enter?: Transformer;
    exit?: Transformer;
  }
};

function traverse(ast: OnigurumaAst, visitor: Visitor, state: State = null) {
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
  ) {
    const keyIsNumber = typeof key === 'number';
    if ((keyIsNumber && !container) || (!keyIsNumber && container)) { // XOR
      throw new Error('Container expected with numeric key');
    }
    let keyShift = 0;
    let skipTraversingKidsOfPath = false;
    const path: Path = {
      node,
      parent,
      key,
      container,
      root: ast,
      remove() {
        assertIsNumber(key);
        container?.splice(Math.max(0, key + keyShift), 1);
        keyShift--;
        skipTraversingKidsOfPath = true;
      },
      removeAllNextSiblings(): Array<Node> {
        assertIsNumber(key);
        return container!.splice(key + 1); // Assuming container is not undefined
      },
      removeAllPrevSiblings(): Array<Node> {
        assertIsNumber(key);
        const shifted = key + keyShift;
        keyShift -= shifted;
        return container!.splice(0, Math.max(0, shifted)); // Assuming container is not undefined
      },
      replaceWith(newNode, options = {}) {
        const traverseNew = !!options.traverse;
        if (container) {
          assertIsNumber(key);
          container[Math.max(0, key + keyShift)] = newNode;
        } else {
          // @ts-expect-error
          parent[key] = newNode;
        }
        if (traverseNew) {
          traverseNode(newNode, parent, key, container);
        }
        skipTraversingKidsOfPath = true;
      },
      replaceWithMultiple(newNodes, options = {}) {
        const traverseNew = !!options.traverse;
        assertIsNumber(key);
        container?.splice(Math.max(0, key + keyShift), 1, ...newNodes);
        keyShift += newNodes.length - 1;
        if (traverseNew) {
          let keyShiftInLoop = 0;
          for (let i = 0; i < newNodes.length; i++) {
            keyShiftInLoop += traverseNode(newNodes[i], parent, key + i + keyShiftInLoop, container);
          }
        }
        skipTraversingKidsOfPath = true;
      },
      skip() {
        skipTraversingKidsOfPath = true;
      },
    };

    const anyType = visitor['*'];
    const thisType = visitor[node.type];
    const enterAllFn = typeof anyType === 'function' ? anyType : anyType?.enter;
    const enterThisFn = typeof thisType === 'function' ? thisType : thisType?.enter;
    enterAllFn?.(path, state);
    enterThisFn?.(path, state);

    if (!skipTraversingKidsOfPath) {
      switch (node.type) {
        case NodeTypes.Regex:
          traverseNode(node.pattern, node, 'pattern');
          traverseNode(node.flags, node, 'flags');
          break;
        case NodeTypes.Alternative:
        case NodeTypes.CharacterClass:
          traverseArray(node.elements, node);
          break;
        case NodeTypes.Assertion:
        case NodeTypes.Backreference:
        case NodeTypes.Character:
        case NodeTypes.CharacterSet:
        case NodeTypes.Directive:
        case NodeTypes.Flags:
        // @ts-expect-error TODO: <github.com/slevithan/oniguruma-parser/issues/3>
        case NodeTypes.Recursion:
        case NodeTypes.Subroutine:
          break;
        case NodeTypes.AbsentFunction:
        case NodeTypes.CapturingGroup:
        case NodeTypes.Group:
        case NodeTypes.Pattern:
          traverseArray(node.alternatives, node);
          break;
        case NodeTypes.CharacterClassRange:
          traverseNode(node.min, node, 'min');
          traverseNode(node.max, node, 'max');
          break;
        case NodeTypes.LookaroundAssertion:
          traverseArray(node.alternatives, node);
          break;
        case NodeTypes.Quantifier:
          traverseNode(node.element, node, 'element');
          break;
        default:
          // @ts-expect-error
          throw new Error(`Unexpected node type "${node.type}"`);
      }
    }

    // @ts-expect-error
    anyType?.exit?.(path, state);
    // @ts-expect-error
    thisType?.exit?.(path, state);
    return keyShift;
  }
  traverseNode(ast);
}

function assertIsNumber(value: unknown): asserts value is number {
  if (typeof value !== 'number') {
    throw new Error('Numeric key expected');
  }
}

export {
  traverse,
  type Path,
  type Visitor,
};

import type {AlternativeElementNode, AlternativeNode, CharacterClassElementNode, Node, NodeType, OnigurumaAst, ParentNode, RegexNode} from '../parser/parse.js';
import {throwIfNullable} from '../utils.js';

type Path<T = Node> = {
  node: T;
  parent: ParentNode | null;
  key: number | string | null;
  container: Array<ContainerElementNode> | null;
  root: RegexNode; // Same as `OnigurumaAst`
  remove: () => void;
  removeAllNextSiblings: () => Array<Node>;
  removeAllPrevSiblings: () => Array<Node>;
  replaceWith: (newNode: Node, options?: {traverse?: boolean}) => void;
  replaceWithMultiple: (newNodes: Array<Node>, options?: {traverse?: boolean}) => void;
  skip: () => void;
};

type Visitor<State = null> = {
  [key in '*' | NodeType]?: VisitorNodeFn<State> | {
    enter?: VisitorNodeFn<State>;
    exit?: VisitorNodeFn<State>;
  };
};

type VisitorNodeFn<State> = (path: Path, state: State) => void;

type ContainerElementNode =
  AlternativeNode | // Within `alternatives` container of any `AlternativeContainerNode`
  AlternativeElementNode | // Within `elements` container of `AlternativeNode`
  CharacterClassElementNode; // Within `elements` container of `CharacterClassNode`

function traverse<State = null>(ast: OnigurumaAst, visitor: Visitor<State>, state: State | null = null) {
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
      root: ast,
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
          // - For `QuantifierNode`: 'element'
          // - For `RegexNode`: 'pattern', 'flags'
          // @ts-expect-error
          throwIfNullable(parent, `Can't replace root node`)[key as string] = newNode;
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
    enterAllFn?.(path, state!);
    enterThisFn?.(path, state!);

    if (!skipTraversingKidsOfPath) {
      switch (type) {
        case 'Regex':
          traverseNode(node.pattern, node, 'pattern');
          traverseNode(node.flags, node, 'flags');
          break;
        case 'Alternative':
        case 'CharacterClass':
          traverseArray(node.elements, node);
          break;
        case 'Assertion':
        case 'Backreference':
        case 'Character':
        case 'CharacterSet':
        case 'Directive':
        case 'Flags':
        // @ts-expect-error TODO: Remove `Recursion`; see <github.com/slevithan/oniguruma-parser/issues/3>
        case 'Recursion':
        case 'Subroutine':
          break;
        case 'AbsentFunction':
        case 'CapturingGroup':
        case 'Group':
        case 'Pattern':
          traverseArray(node.alternatives, node);
          break;
        case 'CharacterClassRange':
          traverseNode(node.min, node, 'min');
          traverseNode(node.max, node, 'max');
          break;
        case 'LookaroundAssertion':
          traverseArray(node.alternatives, node);
          break;
        case 'Quantifier':
          traverseNode(node.element, node, 'element');
          break;
        default:
          throw new Error(`Unexpected node type "${type}"`);
      }
    }

    (anyTypeVisitor as Exclude<typeof anyTypeVisitor, Function>)?.exit?.(path, state!);
    (thisTypeVisitor as Exclude<typeof thisTypeVisitor, Function>)?.exit?.(path, state!);
    return keyShift;
  }
  traverseNode(ast);
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
  traverse,
  type Path,
  type Visitor,
};

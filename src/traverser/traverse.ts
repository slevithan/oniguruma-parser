import {NodeTypes, type NodeType, type OnigurumaAst, type PatternNode, type RegexNode, type Node} from '../parser/parse.js';
import {throwIfNot} from '../utils.js';

type Path = {
  node: Node;
  parent?: Node;
  key?: number | string;
  container?: Node[];
  root: RegexNode;
  remove: () => void;
  removeAllNextSiblings: () => Node[];
  removeAllPrevSiblings: () => Node[];
  replaceWith: (newNode: Node, options?: {traverse?: boolean;}) => void;
  replaceWithMultiple: (newNodes: Node[], options?: {traverse?: boolean;}) => void;
  skip: () => void;
};
type Transformer = (
  path: Path,
  state: {
    [key: string]: any;
  }
) => void;
type Visitor = {[key in ('*' | NodeType)]?: Transformer | {enter?: Transformer, exit?: Transformer;};};
type State = {[key: string]: any;};

/**
@param {OnigurumaAst} ast
@param {Visitor} visitor
@param {State} [state]
*/
function traverse(ast: OnigurumaAst, visitor: Visitor, state: State = null) {
  function traverseArray(array: Node[], parent: Node) {
    for (let i = 0; i < array.length; i++) {
      const keyShift = traverseNode(array[i], parent, i, array);
      i = Math.max(-1, i + keyShift);
    }
  }
  function traverseNode(node: OnigurumaAst | PatternNode | Node, parent: Node = null, key: number | string = null, container: Node[] = null) {
    const containerExpected = 'Container expected';
    let keyShift = 0;
    let skipTraversingKidsOfPath = false;
    const path: Path = {
      node,
      parent,
      key,
      container,
      root: ast,
      remove(): void {
        // TODO: assuming key is a number
        throwIfNot(container, containerExpected).splice(Math.max(0, <number>key + keyShift), 1);
        keyShift--;
        skipTraversingKidsOfPath = true;
      },
      removeAllNextSiblings(): Node[] {
        // TODO: assuming key is a number
        return throwIfNot(container, containerExpected).splice(<number>key + 1);
      },
      removeAllPrevSiblings(): Node[] {
        // TODO: assuming key is a number
        const shifted = <number>key + keyShift;
        keyShift -= shifted;
        return throwIfNot(container, containerExpected).splice(0, Math.max(0, shifted));
      },
      replaceWith(newNode: Node, options: {traverse?: boolean;} = {}): void {
        const traverseNew = !!options.traverse;
        if (container) {
          // TODO: assuming key is a number
          container[Math.max(0, <number>key + keyShift)] = newNode;
        } else {
          parent[key] = newNode;
        }
        if (traverseNew) {
          traverseNode(newNode, parent, key, container);
        }
        skipTraversingKidsOfPath = true;
      },
      replaceWithMultiple(newNodes: Node[], options: {traverse?: boolean;} = {}) {
        const traverseNew = !!options.traverse;
        // TODO: assuming key is a number
        throwIfNot(container, containerExpected).splice(Math.max(0, <number>key + keyShift), 1, ...newNodes);
        keyShift += newNodes.length - 1;
        if (traverseNew) {
          let keyShiftInLoop = 0;
          for (let i = 0; i < newNodes.length; i++) {
            // TODO: assuming key is a number
            keyShiftInLoop += traverseNode(newNodes[i], parent, <number>key + i + keyShiftInLoop, container);
          }
        }
        skipTraversingKidsOfPath = true;
      },
      skip(): void {
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
        //@ts-ignore
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
          //@ts-ignore
          throw new Error(`Unexpected node type "${node.type}"`);
      }
    }

    //@ts-ignore
    anyType?.exit?.(path, state);
    //@ts-ignore
    thisType?.exit?.(path, state);
    return keyShift;
  }
  traverseNode(ast);
}

export {
  traverse,
};

import {NodeTypes} from '../parser/parse.js';
import {throwIfNot} from '../utils.js';

/**
@typedef {{
  node: import('../parser/parse.js').Node;
  parent: import('../parser/parse.js').Node?;
  key: (number | string)?;
  container: Array<import('../parser/parse.js').Node>?;
  root: import('../parser/parse.js').RegexNode;
  remove: () => void;
  removeAllNextSiblings: () => Array<import('../parser/parse.js').Node>;
  removeAllPrevSiblings: () => Array<import('../parser/parse.js').Node>;
  replaceWith: (newNode: import('../parser/parse.js').Node, options?: {traverse?: boolean}) => void;
  replaceWithMultiple: (newNodes: Array<import('../parser/parse.js').Node>, options?: {traverse?: boolean}) => void;
  skip: () => void;
}} Path
@typedef {
  ( path: Path,
    state: {
      [key: string]: any;
    }
  ) => void
} Transformer
*/

/**
@param {import('../parser/parse.js').OnigurumaAst} ast
@param {{
  [key in ('*' | import('../parser/parse.js').NodeType)]?: Transformer | {enter?: Transformer, exit?: Transformer};
}} visitor
@param {{
  [key: string]: any;
}} [state]
*/
function traverse(ast, visitor, state = null) {
  function traverseArray(array, parent) {
    for (let i = 0; i < array.length; i++) {
      const keyShift = traverseNode(array[i], parent, i, array);
      i = Math.max(-1, i + keyShift);
    }
  }
  function traverseNode(node, parent = null, key = null, container = null) {
    const containerExpected = 'Container expected';
    let keyShift = 0;
    let skipTraversingKidsOfPath = false;
    const path = {
      node,
      parent,
      key,
      container,
      root: ast,
      remove() {
        throwIfNot(container, containerExpected).splice(Math.max(0, key + keyShift), 1);
        keyShift--;
        skipTraversingKidsOfPath = true;
      },
      removeAllNextSiblings() {
        return throwIfNot(container, containerExpected).splice(key + 1);
      },
      removeAllPrevSiblings() {
        const shifted = key + keyShift;
        keyShift -= shifted;
        return throwIfNot(container, containerExpected).splice(0, Math.max(0, shifted));
      },
      replaceWith(newNode, options = {}) {
        const traverseNew = !!options.traverse;
        if (container) {
          container[Math.max(0, key + keyShift)] = newNode;
        } else {
          parent[key] = newNode;
        }
        if (traverseNew) {
          traverseNode(newNode, parent, key, container);
        }
        skipTraversingKidsOfPath = true;
      },
      replaceWithMultiple(newNodes, options = {}) {
        const traverseNew = !!options.traverse;
        throwIfNot(container, containerExpected).splice(Math.max(0, key + keyShift), 1, ...newNodes);
        keyShift += newNodes.length - 1;
        if (traverseNew) {
          for (let i = 0; i < newNodes.length; i++) {
            traverseNode(newNodes[i], parent, key + i, container);
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
          throw new Error(`Unexpected node type "${node.type}"`);
      }
    }

    anyType?.exit?.(path, state);
    thisType?.exit?.(path, state);
    return keyShift;
  }
  traverseNode(ast);
}

export {
  traverse,
};

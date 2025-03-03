import {AstTypes} from '../parser/parse.js';
import {throwIfNot} from '../utils.js';

function traverse(ast, state, visitor) {
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
      ast,
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
          for (const newNode of newNodes) {
            traverseNode(newNode, parent, key, container);
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
        case AstTypes.Regex:
          traverseNode(node.pattern, node, 'pattern');
          traverseNode(node.flags, node, 'flags');
          break;
        case AstTypes.Alternative:
        case AstTypes.CharacterClass:
          traverseArray(node.elements, node);
          break;
        case AstTypes.Assertion:
        case AstTypes.Backreference:
        case AstTypes.Character:
        case AstTypes.CharacterSet:
        case AstTypes.Directive:
        case AstTypes.Flags:
        case AstTypes.Recursion:
        case AstTypes.Subroutine:
          break;
        case AstTypes.AbsentFunction:
        case AstTypes.CapturingGroup:
        case AstTypes.Group:
        case AstTypes.Pattern:
          traverseArray(node.alternatives, node);
          break;
        case AstTypes.CharacterClassRange:
          traverseNode(node.min, node, 'min');
          traverseNode(node.max, node, 'max');
          break;
        case AstTypes.LookaroundAssertion:
          traverseArray(node.alternatives, node);
          break;
        case AstTypes.Quantifier:
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

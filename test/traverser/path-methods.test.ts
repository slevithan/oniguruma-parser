import type {CharacterNode, CharacterSetNode, GroupNode} from '../../dist/parser/parse.js';
import type {Visitor} from '../../dist/traverser/traverse.js';
import {toOnigurumaAst} from '../../dist/index.js';
import {createCharacter, createCharacterSet} from '../../dist/parser/parse.js';
import {traverse} from '../../dist/traverser/traverse.js';
import {cpOf} from '../../dist/utils.js';
import {singleAltAst} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Traverser: path', () => {
  describe('replaceWith', () => {
    it('should replace a node with a new node', () => {
      const visitor: Visitor = {
        Character({node, replaceWith}) {
          const {value} = node as CharacterNode;
          if (value === cpOf('a')) {
            replaceWith(createCharacterSet('dot'));
          }
        },
        CharacterSet({node, replaceWith}) {
          const {kind} = node as CharacterSetNode;
          if (kind === 'dot') {
            replaceWith(createCharacter(cpOf('a')));
          }
        },
      };
      expect(traverse(toOnigurumaAst('a.'), visitor)).toEqual(singleAltAst([
        createCharacterSet('dot'),
        createCharacter(cpOf('a')),
      ]));
    });
  });

  describe('replaceWithMultiple', () => {
    it('should replace a node with multiple nodes', () => {
      const visitor: Visitor = {
        Group({node, replaceWithMultiple}) {
          const {body} = node as GroupNode;
          replaceWithMultiple(body[0].elements, {traverse: true});
        },
      };
      expect(traverse(toOnigurumaAst('(?:a(?:b))'), visitor)).toEqual(singleAltAst([
        createCharacter(cpOf('a')),
        createCharacter(cpOf('b')),
      ]));
      expect(traverse(toOnigurumaAst('(?:a(?:bc))'), visitor)).toEqual(singleAltAst([
        createCharacter(cpOf('a')),
        createCharacter(cpOf('b')),
        createCharacter(cpOf('c')),
      ]));
    });
  });

  // TODO: Add tests for the remaining path methods
});

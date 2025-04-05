import type {GroupNode} from '../../dist/parser/parse.js';
import type {Visitor} from '../../dist/traverser/traverse.js';
import {toOnigurumaAst} from '../../dist/index.js';
import {createCharacter} from '../../dist/parser/parse.js';
import {traverse} from '../../dist/traverser/traverse.js';
import {cpOf} from '../../dist/utils.js';
import {singleAltAst} from '../spec-utils.js';
import {describe, expect, it} from 'vitest';

describe('Traverser: path', () => {
  describe('replaceWithMultiple', () => {
    it('should replace a node with multiple nodes', () => {
      const visitor: Visitor = {
        Group({node, replaceWithMultiple}) {
          const {alternatives} = node as GroupNode;
          replaceWithMultiple(alternatives[0].elements, {traverse: true});
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
});

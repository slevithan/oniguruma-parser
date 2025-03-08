import {toOnigurumaAst} from '../dist/index.js';
import {traverse} from '../dist/traverser/traverse.js';

describe('Traverser', () => {
  describe('traverse', () => {
    describe('replaceWithMultiple', () => {
      it('should replace a node with multiple nodes', () => {
        const ast = toOnigurumaAst('(?:a(?:b))');
        traverse(ast, {
          Group({node, replaceWithMultiple}) {
            replaceWithMultiple(node.alternatives[0].elements, {traverse: true});
          },
        });
        expect(ast).toEqual({
          type: 'Regex',
          pattern: {
            type: 'Pattern',
            alternatives: [
              {
                type: 'Alternative',
                elements: [
                  {
                    type: 'Character',
                    value: 97,
                  },
                  {
                    type: 'Character',
                    value: 98,
                  },
                ],
              },
            ],
          },
          flags: {
            type: 'Flags',
            digitIsAscii: false,
            dotAll: false,
            extended: false,
            ignoreCase: false,
            posixIsAscii: false,
            spaceIsAscii: false,
            wordIsAscii: false,
          },
        });
      });
    });
  });
});

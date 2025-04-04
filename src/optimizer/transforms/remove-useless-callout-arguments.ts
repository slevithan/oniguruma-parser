import type {NamedCalloutNode, Node} from '../../parser/parse.js';
import type {Path, Visitor} from '../../traverser/traverse.js';

/**
oniguruma skips over/ignores redundant/useless commas and empty brackets {}
*/
const removeUselessCalloutArguments: Visitor = {
  NamedCallout(path: Path) {
    const {node, replaceWith} = path as Path<NamedCalloutNode>;
    const {kind, arguments: oldArguments} = node;
    if (!Array.isArray(oldArguments)) {
      return;
    }
    const newArguments: Array<string | number> = oldArguments.
      filter((argument) => argument !== '').
      // Custom Named Callouts might treat `+05` as a string
      map((argument) => /* kind !== 'custom' && */
        typeof argument === 'string' &&
          /^[+-]?\d+$/.test(argument) ?
          +argument :
          argument);
    node.arguments = newArguments.length ? newArguments : null;
    replaceWith(node);
  },
};

export {
  removeUselessCalloutArguments,
};

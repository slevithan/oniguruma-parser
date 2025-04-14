# Contributing guide

Thanks for lending a hand 👋

If you have questions before starting development, feel free to open an issue.

To get a feel for how the code is structured, you might want to start with `./src/index.ts`, which includes `toOnigurumaAst`. You also might want to look over the existing readmes:

- [Main](https://github.com/slevithan/oniguruma-parser/blob/main/README.md).
- [Optimizer](https://github.com/slevithan/oniguruma-parser/blob/main/src/optimizer/README.md).
- [Traverser](https://github.com/slevithan/oniguruma-parser/blob/main/src/traverser/README.md).
- [Parser](https://github.com/slevithan/oniguruma-parser/blob/main/src/parser/README.md).
- [Tokenizer](https://github.com/slevithan/oniguruma-parser/blob/main/src/tokenizer/README.md).
- [Generator](https://github.com/slevithan/oniguruma-parser/blob/main/src/generator/README.md).

## Setup

- `oniguruma-parser` uses [pnpm](https://pnpm.io/) to manage dependencies. Install it with `npm install --global pnpm`.
- Install dependencies with `pnpm install`.
- Build the package with `pnpm build`.

## Testing

- `oniguruma-parser` uses [Vitest](https://vitest.dev/) to test the codebase. Run `pnpm test` to start the test runner.
- Tests live in `./test`.
- Please include tests alongside changes and new features.

### Extending test coverage via other libraries

Test coverage for some modules is currently limited. The optimizer is an exception, since it includes tests for all optimizations. Fortunately, the optimizer's tests check end-to-end results that have gone through every part of this library: the tokenizer, parser, traverser, optimizer, and generator.

Part of the reason for the currently limited tests is that this library's tokenizer, parser, and traverser were originally built for and extracted from [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es), which includes broader coverage with end-to-end tests for results that have gone through `oniguruma-parser`'s tokenizer, parser, and traverser, as part of transpilation. So, if you're making major changes, it might be beneficial to also check that your changes don't break anything in `oniguruma-to-es`'s tests. You can do so by cloning the `oniguruma-to-es` library, updating its `package.json` to point to your in-development copy of `oniguruma-parser` (by changing the dependency's version string to e.g. `"file:../oniguruma-parser"`), and then running `pnpm install` and `pnpm test`.

This library also receives extensive test coverage prior to new releases via the `tm-grammars` and `shiki` libraries, which test all parts of this library against ~55k real-world Oniguruma regexes used in TextMate grammars.

## Demo page

A demo REPL for the optimizer is included in this library and [available online](https://slevithan.github.io/oniguruma-parser/demo/). It shows results as you type and can be helpful for quick manual testing. You can also use it to test the generator by enabling the "Don't optimize (show generator output)" option. Other parts of this library can be tested on the demo page via the developer console.

> [!IMPORTANT]
> The demo uses the latest published version of the library. To use local changes, you currently have to uncomment the relevant `<script>` tags in `./demo/index.html`. Run `pnpm build` to include your changes in the local bundle.

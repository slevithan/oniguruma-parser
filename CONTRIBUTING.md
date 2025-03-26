# Contributing guide

Thanks for lending a hand 👋

## Setup

- `oniguruma-parser` uses [pnpm](https://pnpm.io/) to manage dependencies. Install it with `npm install --global pnpm`.
- Install dependencies with `pnpm install`.
- Build the package with `pnpm build`.

## Testing

- `oniguruma-parser` uses [Jasmine](https://jasmine.github.io/) to test the codebase. Run `pnpm test` to build the package and start the test runner.
- Tests live in `./spec`.
- Please include tests alongside changes and new features.

### Extending test coverage via other libraries

Apart from the optimizer (which includes tests for all optimizations), test coverage is currently limited. This will improve in future versions. That said, the optimizer's tests check end-to-end results that have gone through every part of this library: the tokenizer, parser, traverser, optimizer, and generator.

Part of the reason for the currently limited tests is that this library's tokenizer, parser, and traverser were originally built for and extracted from [`oniguruma-to-es`](https://github.com/slevithan/oniguruma-to-es), which includes broader coverage with end-to-end tests that check results that have gone through `oniguruma-parser`'s tokenizer, parser, and traverser. So, if you're making major changes, it may be beneficial to also check that your changes don't break anything in `oniguruma-to-es`'s tests. You can do by cloning the `oniguruma-to-es` library, updating its `package.json` to point to your local copy of `oniguruma-parser` (by changing the dependency's version from e.g. `"^0.7.0"` to `"file:../oniguruma-parser"`), and then running `pnpm install` and `pnpm test`.

This library also receives extensive test coverage prior to new releases via the `tm-grammars` and `shiki` libraries, which test all parts of this library against ~55k real-world Oniguruma regexes used in TextMate grammars.

### Manual testing via the demo page

A demo REPL for the optimizer (and also for the generator if you enable the "Don't optimize (show generator output)" option) is included in this library and available online via GitHub Pages: [Optimizer demo](https://slevithan.github.io/oniguruma-parser/demo/). It can also be used to test other parts of the library via the console.

> [!WARNING]
> The demo uses the last published version of the library. To use local changes, you currently have to uncomment the relevant script tags in `./demo/index.html`. Make sure to run `pnpm build` to include your changes in the local bundle.

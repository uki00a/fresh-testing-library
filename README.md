# fresh-testing-library

`fresh-testing-library` provides various utilitites to write unit/integration
tests for fresh apps.

## Features

- Support testing of handlers/middlewares/islands/routes
- Jest-compatible `expect()` API
- Emulate Partial rendering, etc. as much as possible

## Installation

At first, you need to add this library as a dependency to `deno.json` or
`import_map.json`:

```jsonc
  // ...
  "imports": {
    "$std/": "https://deno.land/std@0.190.0/",
    "🏝️/": "./islands/",
    "$fresh/": "https://deno.land/x/fresh@1.2.0/",
    // ...

    // Add the following lines to your deno.json
    "$fresh-testing-library": "https://deno.land/x/fresh_testing_library@$MODULE_VERSION/mod.ts",
    "$fresh-testing-library/": "https://deno.land/x/fresh_testing_library@$MODULE_VERSION/"
  },
  // ...
```

## Permissions

This package requires several permissions.

See [docs/permissions](docs/permissions.md) for details.

## Usage

### Testing island components

`$fresh-testing-library/components.ts` is a thin wrapper to
[@testing-library/preact](https://github.com/testing-library/preact-testing-library)
and
[@testing-library/user-event](https://github.com/testing-library/user-event).
This module can be used to test island components.

See [examples/island-component.test.tsx](examples/island-component.test.tsx) for
usage.

### `expect()` API

`$fresh-testing-library/expect.ts` provides the `expect()` API. It is based on
[expect](https://github.com/jestjs/jest/tree/v29.7.0/packages/expect) and
[jest-mock](https://github.com/jestjs/jest/tree/v29.7.0/packages/jest-mock)
packages, so it is compatible with Jest.

```ts
import { expect, fn } from "$fresh-testing-library/expect.ts";

expect(1).toBe(1);

const spy = fn();
expect(spy).not.toBeCalled();
spy();
expect(spy).toBeCalled();

// Matchers provided by `@testing-library/jest-dom` are also supported.
expect(expect(null).toBeInTheDocument).toBeTruthy();
```

### Testing fresh middlewares

You can test fresh middlewares using `createFreshContext()` API. See
[examples/middleware.test.ts](examples/middleware.test.ts) for usage.

### Testing fresh handlers

You can also test fresh handlers using `createFreshContext()` API. See
[examples/handler.test.ts](examples/handler.test.ts) for usage.

### Testing async route components

You can test async route components by combining `createFreshContext()` and
`render()`. See
[examples/async-component.test.tsx](examples/async-component.test.tsx) for
details.

### Submodules

This library provides submodules so that only necessary functions can be
imported.

```ts
import { createFreshContext } from "$fresh-testing-library/server.ts";

import {
  cleanup,
  render,
  setup,
  userEvent,
} from "$fresh-testing-library/components.ts";

import { expect } from "$fresh-testing-library/expect.ts";
```

## Recipes

### Testing a component which uses relative `fetch()`

By combining [MSW](https://github.com/mswjs/msw) and `--location` flag, you can
test a component which calls `fetch()` with a relative URL.

First, add the following setting to `deno.json`:

```jsonc
{
  "imports": {
    // Add the following line:
    "msw": "npm:msw@2.0.8"
  }
}
```

Now you can use MSW! See [examples/msw.test.ts](examples/msw.test.ts) for
details.

# fresh-testing-library

`fresh-testing-library` provides various utilitites to write unit/integration
tests for fresh apps.

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

```tsx
import {
  cleanup,
  render,
  setup,
  userEvent,
} from "$fresh-testing-library/components.ts";
import { expect } from "$fresh-testing-library/expect.ts";
import { signal } from "@preact/signals";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";

import Counter from "🏝️/Counter.tsx";

describe("islands/Counter.tsx", () => {
  beforeAll(setup);
  afterEach(cleanup);

  it("should work", async () => {
    const count = signal(9);
    const user = userEvent.setup();
    const screen = render(<Counter count={count} />);
    const plusOne = screen.getByRole("button", { name: "+1" });
    const minusOne = screen.getByRole("button", { name: "-1" });
    expect(screen.getByText("9")).toBeInTheDocument();

    await user.click(plusOne);
    expect(screen.queryByText("9")).not.toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    await user.click(minusOne);
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.queryByText("10")).not.toBeInTheDocument();
  });
});
```

### `expect()` API

`$fresh-testing-library/expect.ts` provides the `expect()` API. It is based on
[expect](https://github.com/jestjs/jest/tree/v29.7.0/packages/expect) and
[jest-mock](https://github.com/jestjs/jest/tree/v29.7.0/packages/jest-mock)
packages, so it is compatible with Jest.

```ts
import { expect, fn } from "$fresh-testing-library/expect.ts";

Deno.test("expect", () => {
  expect(1).toBe(1);

  const spy = fn();
  expect(spy).not.toBeCalled();
  spy();
  expect(spy).toBeCalled();

  // Matchers provided by `@testing-library/jest-dom` are also supported.
  expect(expect(null).toBeInTheDocument).toBeTruthy();
});
```

### Testing fresh middlewares

You can test fresh middlewares using `createMiddlewareHandlerContext` API:

```ts
import { createMiddlewareHandlerContext } from "$fresh-testing-library/server.ts";
import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { describe, it } from "$std/testing/bdd.ts";

import { createLoggerMiddleware } from "./demo/routes/(_middlewares)/logger.ts";
import manifest from "./demo/fresh.gen.ts";

describe("createLoggerMiddleware", () => {
  it("returns a middleware which logs the information about each request", async () => {
    const messages: Array<string> = [];
    const testingLogger = {
      info(...args: Array<unknown>) {
        messages.push(args.map(String).join(""));
      },
    };
    const middleware = createLoggerMiddleware(testingLogger);
    const path = `/api/users/123`;
    const req = new Request(`http://localhost:3000${path}`);
    const ctx = createMiddlewareHandlerContext(req, { manifest });
    await middleware(req, ctx);
    assertEquals(messages, [
      `<-- GET ${path}`,
      `--> GET ${path} 200`,
    ]);
  });
});
```

### Testing fresh handlers

You can test fresh handlers using `createHandlerContext` API:

```ts
import { createHandlerContext } from "$fresh-testing-library/server.ts";

import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { describe, it } from "$std/testing/bdd.ts";

import { handler } from "./demo/routes/api/users/[id].ts";
import manifest from "./demo/fresh.gen.ts";

describe("handler.GET", () => {
  it("should work", async () => {
    assert(handler.GET);

    const req = new Request("http://localhost:8000/api/users/1");
    const ctx = createHandlerContext(req, { manifest });
    assertEquals(ctx.params, { id: "1" });

    const res = await handler.GET(req, ctx);
    assertEquals(res.status, 200);
    assertEquals(await res.text(), "bob");
  });
});
```

### Testing async route components

You can test async route components by combining `createRouteContext()` and
`render()`:

```ts
import {
  cleanup,
  getByText,
  render,
  setup,
} from "$fresh-testing-library/components.ts";
import { createRouteContext } from "$fresh-testing-library/server.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";
import { default as UserDetail } from "./demo/routes/users/[id].tsx";
import { default as manifest } from "./demo/fresh.gen.ts";
import { createInMemoryUsers } from "./demo/services/users.ts";

describe("routes/users/[id].tsx", () => {
  beforeAll(setup);
  afterEach(cleanup);

  it("should work", async () => {
    const req = new Request("http://localhost:8000/users/2");
    const state = { users: createInMemoryUsers() };
    const ctx = createRouteContext<void, typeof state>(req, {
      manifest,
      // It is possible to inject dependencies into `ctx.state` with `state` option.
      state,
    });
    const screen = render(await UserDetail(req, ctx));
    const group = screen.getByRole("group");
    assertExists(getByText(group, "bar"));
  });
});
```

### Submodules

This library provides submodules so that only necessary functions can be
imported.

```ts
import { createHandlerContext } from "$fresh-testing-library/server.ts";

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

First, add the following lines to `deno.json`.

```javascript
{
  "imports": {
    "msw": "npm:msw@2.0.8",
    "msw/node": "npm:msw@2.0.8/node",
    // ...
  }
}
```

Then you can use MSW as follows:

```typescript
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { expect } from "$fresh-testing-library/expect.ts";
import { afterAll, beforeAll, describe, it } from "$std/testing/bdd.ts";

// You should pass `--location` flag.
expect(location).toBeTruthy();

describe("msw", () => {
  const server = setupServer(
    http.get(`${location.origin}/api/user`, () =>
      HttpResponse.json({
        id: 1,
        name: "foo",
      })),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());

  it("can be used to intercept requests", async () => {
    const res = await globalThis.fetch("/api/user", {
      method: "GET",
    });
    expect(await res.json()).toEqual({ id: 1, name: "foo" });
  });
});
```

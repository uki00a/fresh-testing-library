# fresh-testing-library

A thin wrapper to
[@testing-library/preact](https://github.com/testing-library/preact-testing-library)
for testing a [fresh](https://github.com/denoland/fresh) application.

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

    // Add the following line to your deno.json
    "$fresh-testing-library": "https://deno.land/x/fresh_testing_library@$MODULE_VERSION/mod.ts"
  },
  // ...
```

## Usage

### Testing island components

```tsx
import { cleanup, fireEvent, render, setup } from "$fresh-testing-library";
import { signal } from "@preact/signals";
import {
  assertEquals,
  assertExists,
  assertFalse,
} from "$std/testing/asserts.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";

import Counter from "🏝️/Counter.tsx";

describe("islands/Counter.tsx", () => {
  beforeAll(setup);
  afterEach(cleanup);

  it("should work", async () => {
    const count = signal(9);
    const screen = render(<Counter count={count} />);
    const plusOne = screen.getByRole("button", { name: "+1" });
    const minusOne = screen.getByRole("button", { name: "-1" });
    assertExists(screen.queryByText("9"));

    await fireEvent.click(plusOne);
    assertFalse(screen.queryByText("9"));
    assertExists(screen.queryByText("10"));

    await fireEvent.click(minusOne);
    assertExists(screen.queryByText("9"));
    assertFalse(screen.queryByText("10"));
  });
});
```

### Testing fresh handlers

You can test fresh handlers using `createHandlerContext` API:

```ts
import { createHandlerContext } from "$fresh-testing-library";

import { assert, assertEquals } from "$std/testing/asserts.ts";
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

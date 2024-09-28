import { createFreshContext } from "$fresh-testing-library/server.ts";

import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { describe, it } from "$std/testing/bdd.ts";

import { handler } from "$/routes/api/users/[id].ts";
import manifest from "$/fresh.gen.ts";

describe("handler.GET", () => {
  it("should work", async () => {
    assert(handler.GET);

    const req = new Request("http://localhost:8000/api/users/1");
    const ctx = createFreshContext(req, { manifest });
    assertEquals(ctx.params, { id: "1" });

    const res = await handler.GET(req, ctx);
    assertEquals(res.status, 200);
    assertEquals(await res.text(), "bob");
  });
});

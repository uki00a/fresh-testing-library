import {
  cleanup,
  getByText,
  render,
  setup,
} from "$fresh-testing-library/components.ts";
import { createFreshContext } from "$fresh-testing-library/server.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";
import { default as UserDetail } from "$/routes/users/[id].tsx";
import { default as manifest } from "$/fresh.gen.ts";
import { createInMemoryUsers } from "$/services/users.ts";

describe("routes/users/[id].tsx", () => {
  beforeAll(() => setup({ manifest }));
  afterEach(cleanup);

  it("should work", async () => {
    const req = new Request("http://localhost:8000/users/2");
    const state = { users: createInMemoryUsers() };
    const ctx = createFreshContext<void, typeof state>(req, {
      // NOTE: If `manifest` option was specified in `setup()`, it can be omitted here.
      // It is also possible to inject dependencies into `ctx.state` with `state` option.
      state,
    });
    const screen = render(await UserDetail(req, ctx));
    const group = screen.getByRole("group");
    assertExists(getByText(group, "bar"));
  });
});

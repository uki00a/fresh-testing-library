import { createRouteContext } from "$fresh-testing-library/server.ts";
import {
  cleanup,
  getByText,
  render,
  setup,
} from "$fresh-testing-library/components.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";
import { default as UserDetail } from "./demo/routes/users/[id].tsx";
import { default as manifest } from "./demo/fresh.gen.ts";

describe("testing async route components", () => {
  beforeAll(setup);
  afterEach(cleanup);

  it("can be tested", async () => {
    const req = new Request("http://localhost:8000/users/2");
    const ctx = createRouteContext<void>(req, { manifest });
    const screen = render(await UserDetail(req, ctx));
    const list = screen.getByRole("group");
    assertExists(getByText(list, "2"));
    assertExists(getByText(list, "bar"));
  });
});

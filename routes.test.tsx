import { createFreshContext } from "$fresh-testing-library/server.ts";
import {
  cleanup,
  getByText,
  render,
  setup,
  userEvent,
} from "$fresh-testing-library/components.ts";
import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";
import { cheerio } from "./deps/cheerio.ts";
import { default as UserDetail } from "./demo/routes/users/[id].tsx";
import { default as manifest } from "./demo/fresh.gen.ts";
import type { Data } from "./demo/routes/(admin)/dashboard.tsx";
import { handler } from "./demo/routes/(admin)/dashboard.tsx";
import { createInMemoryUsers } from "./demo/services/users.ts";
import DocPage from "./demo/routes/docs/[...path].tsx";
import DocLayout from "./demo/routes/docs/_layout.tsx";

describe("routes testing", () => {
  beforeAll(() => setup({ manifest }));
  afterEach(cleanup);

  it("supports testing an async route component", async () => {
    const req = new Request("http://localhost:8000/users/2");
    const state = { users: createInMemoryUsers() };
    const ctx = createFreshContext<void, typeof state>(req, {
      manifest,
      state,
    });
    const screen = render(await UserDetail(req, ctx));
    const list = screen.getByRole("group");
    assertExists(getByText(list, "2"));
    assertExists(getByText(list, "bar"));
  });

  it("supports testing a route component with `handler.GET`", async () => {
    // https://github.com/uki00a/fresh-testing-library/issues/38
    const request = new Request("http://localhost:8000/dashboard");
    const ctx = createFreshContext<Data, Data>(
      request,
      {
        state: { activeUsers: 45, totalUsers: 123 },
        manifest,
      },
    );
    assert(handler.GET);
    const res = await handler.GET(request, ctx);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("content-type"), "text/html; charset=UTF-8");

    const html = await res.text();
    const $ = cheerio.load(html);
    const $dd = $("dd");
    assertEquals($dd.length, 2);
    assertEquals($dd.eq(0).text(), "123");
    assertEquals($dd.eq(1).text(), "45");
  });

  it("supports `<Partial>`", async () => {
    const data = {
      content: `
    <h2>foobar</h2>
    <div f-client-nav="false">
      <a href="/docs/this-should-be-ignored">
        Client-side navigation should be disabled for this link.
      </a>
    </div>
    <div f-client-nav>
      <a href="/docs/permissions">
        This is a link.
      </a>
    </div>`,
    };
    const ctx = createFreshContext({
      manifest,
      data,
    });
    const screen = render(
      // TODO: support rendering `_app.tsx` and `_layout.tsx`.
      <DocLayout {...ctx} Component={() => <DocPage {...ctx} />} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByText("This is a link."));
  });
});

import { createFreshContext } from "./server.ts";
import {
  cleanup,
  getByText,
  render,
  setup,
  userEvent,
} from "$fresh-testing-library/components.ts";
import { expect } from "$fresh-testing-library/expect.ts";
import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { assertStrictEquals } from "$std/assert/assert_strict_equals.ts";
import { assertStringIncludes } from "$std/assert/assert_string_includes.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";
import { cheerio } from "./deps/cheerio.ts";
import { default as UserDetail } from "./demo/routes/users/[id].tsx";
import { default as manifest } from "./demo/fresh.gen.ts";
import type { Data } from "./demo/routes/(admin)/dashboard.tsx";
import { handler } from "./demo/routes/(admin)/dashboard.tsx";
import { createInMemoryUsers } from "./demo/services/users.ts";
import DocPage from "./demo/routes/docs/[...path].tsx";
import DocLayout from "./demo/routes/docs/_layout.tsx";
import { assertDefaultResponseAsync } from "$fresh-testing-library/internal/test_utils/mod.ts";
import type { State } from "🗺/users/_middleware.ts";

describe("integration tests", () => {
  beforeAll(() => setup({ manifest }));
  afterEach(cleanup);

  describe("routes", () => {
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

    it("should use `SetupOptions.manifest` as the default manifest for `createFreshContext`", async () => {
      // TODO: use `demo/routes/index.tsx` for testing.
      const req = new Request("http://localhost:8003/users/1");
      const user = Object.freeze({
        id: 1,
        name: "foo",
        email: "foo@example.com",
      });
      const users = [user];
      const state: State = {
        users: {
          all() {
            return Promise.resolve(users);
          },
          getByID(id) {
            const user = users.find((x) => x.id === id);
            if (user == null) {
              throw new Error("NotFound");
            }
            return Promise.resolve(user);
          },
        },
      };
      {
        const ctx = createFreshContext(req, { manifest: undefined, state });
        const res = await ctx.render();
        await assertDefaultResponseAsync(res);
      }

      {
        const ctx = createFreshContext(req, { state });
        const res = await ctx.render();
        assertStrictEquals(res.status, 200);
        const html = await res.text();
        assertStringIncludes(
          html,
          user.name,
          "`routes/users/[id].tsx` should be rendered",
        );
        assertStringIncludes(
          html,
          user.email,
          "`routes/users/[id].tsx` should be rendered",
        );
      }
    });
  });

  describe("partials", () => {
    it("supports client navigation by an `<a>` tag", async () => {
      const data = Object.freeze({
        content: `First content`,
      });
      const ctx = createFreshContext({
        manifest,
        data,
      });
      const screen = render(
        // TODO: support rendering `_app.tsx` and `_layout.tsx`.
        <DocLayout {...ctx} Component={() => <DocPage {...ctx} />} />,
      );
      const user = userEvent.setup();

      expect(screen.getByText(data.content)).toBeVisible();

      const expectedText = "This module does not require any permissions.";
      expect(screen.queryByText(expectedText)).not.toBeInTheDocument();

      await user.click(screen.getByRole("link", { name: "Permissions" }));

      expect(await screen.findByText(expectedText)).toBeInTheDocument();
      expect(screen.queryByText(data.content)).not
        .toBeInTheDocument();
    });

    it("supports `f-partial`", async () => {
      const data = Object.freeze({
        content: `First content`,
      });
      const partialLinkText = "This is a link with `f-partial`";
      const ctx = createFreshContext({
        manifest,
        data,
      });
      const screen = render(
        // TODO: support rendering `_app.tsx` and `_layout.tsx`.
        <DocLayout
          {...ctx}
          Component={() => (
            <>
              <aside>
                <nav f-client-nav>
                  <a href="/docs" f-partial="/docs/permissions">
                    {partialLinkText}
                  </a>
                  <a href="/docs" f-partial="/docs/no-such-page">
                    NotFound
                  </a>
                </nav>
              </aside>
              <DocPage {...ctx} />
            </>
          )}
        />,
      );
      const user = userEvent.setup();

      expect(screen.getByText(data.content)).toBeVisible();

      const expectedText = "This module does not require any permissions.";
      expect(screen.queryByText(expectedText)).not.toBeInTheDocument();

      await user.click(screen.getByRole("link", { name: partialLinkText }));

      expect(await screen.findByText(expectedText)).toBeInTheDocument();
      expect(screen.queryByText(data.content)).not
        .toBeInTheDocument();
    });
  });
});

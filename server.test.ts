import {
  createFreshContext,
  createHandlerContext,
  createMiddlewareHandlerContext,
  createRouteContext,
} from "$fresh-testing-library/server.ts";
import type { FreshContext, RouteContext } from "$fresh/server.ts";
import { handler } from "🗺/api/users/[id].ts";
import { createLoggerMiddleware } from "🗺/(_middlewares)/logger.ts";
import { createInMemoryUsers } from "🔧/users.ts";

import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { describe, it } from "$std/testing/bdd.ts";

import { cheerio } from "./deps/cheerio.ts";
import {
  assertContextHasDefaultServerInfo,
  assertContextHasServerInfoForRequest,
  assertDefaultResponseAsync,
  loadManifest,
} from "./internal/test_utils/mod.ts";

describe("$fresh-testing-library/server", () => {
  describe("createFreshContext", () => {
    it("returns `FreshContext` which can be passed to fresh handlers", async () => {
      assert(handler.GET);

      const req = new Request("http://localhost:3000/api/users/1");
      const ctx = createFreshContext(req, { params: { id: "1" } });
      const res = await handler.GET(req, ctx);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "bob");
    });

    it("returns `FreshContext` which can be passed to fresh middlewares", async () => {
      const messages: Array<string> = [];
      const testingLogger = {
        info(...args: Array<unknown>) {
          messages.push(args.map(String).join(""));
        },
      };
      const middleware = createLoggerMiddleware(testingLogger);
      const manifest = await loadManifest();
      const path = `/api/users/123`;
      const req = new Request(`http://localhost:3000${path}`);
      const ctx = createFreshContext(req, { manifest });
      await middleware(req, ctx);
      assertEquals(messages, [
        `<-- GET ${path}`,
        `--> GET ${path} 200`,
      ]);
    });

    it("can only receive `Request`", async () => {
      const req = new Request("http://localhost:8019");
      const ctx = createFreshContext(req);
      assertContextHasServerInfoForRequest(ctx, req);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});
      assertEquals(ctx.route, "/");
      assertEquals(ctx.data, {});
      assertEquals(ctx.url.href, "http://localhost:8019/");
      assertEquals(ctx.destination, "notFound");

      const res = await ctx.renderNotFound();
      assertEquals(res.status, 404);
    });

    it("can only receive an empty object", async () => {
      const ctx = createFreshContext({});
      assertContextHasDefaultServerInfo(ctx);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});
      assertEquals(ctx.route, "/");
      assertEquals(ctx.data, {});
      assertEquals(ctx.url.href, "http://localhost:8020/");
      assertEquals(ctx.destination, "notFound");

      const res = await ctx.render();
      await assertDefaultResponseAsync(res);

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);

      const res2 = await ctx.next();
      await assertDefaultResponseAsync(res2);
    });

    it("works with no arguments", async () => {
      const ctx = createFreshContext();
      assertContextHasDefaultServerInfo(ctx);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});
      assertEquals(ctx.route, "/");
      assertEquals(ctx.data, {});
      assertEquals(ctx.url.href, "http://localhost:8020/");
      assertEquals(ctx.destination, "notFound");

      const res = await ctx.render();
      await assertDefaultResponseAsync(res);

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);

      const res2 = await ctx.next();
      await assertDefaultResponseAsync(res2);
    });

    it("can accept `CreateFreshContextOptions`", async () => {
      const ctx = createFreshContext({
        localAddr: {
          transport: "tcp",
          hostname: "127.0.0.1",
          port: 3000,
        },
        remoteAddr: {
          transport: "tcp",
          hostname: "localhost",
          port: 50000,
        },
        params: { id: "123" },
        state: { foo: "bar" },
        data: { name: "foo" },
        response: new Response("foobar"),
        responseNotFound: new Response("This page is not found.", {
          status: 404,
        }),
        destination: "static",
      });
      assert(ctx.localAddr);
      assert(ctx.localAddr.transport === "tcp");
      assertEquals(ctx.localAddr.hostname, "127.0.0.1");
      assertEquals(ctx.localAddr.port, 3000);
      assert(ctx.remoteAddr.transport === "tcp");
      assertEquals(ctx.remoteAddr.hostname, "localhost");
      assertEquals(ctx.remoteAddr.port, 50000);
      assertEquals(ctx.params, { id: "123" });
      assertEquals(ctx.state, { foo: "bar" });
      assertEquals(ctx.data, { name: "foo" });
      assertEquals(ctx.route, "/");
      assertEquals(ctx.url.href, "http://127.0.0.1:3000/");
      assertEquals(ctx.destination, "static");

      const res = await ctx.render();
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "foobar");

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);
      assertEquals(await resNotFound.text(), "This page is not found.");

      const res2 = await ctx.next();
      assertEquals(res2.status, 200);
      assertEquals(await res2.text(), "foobar");
    });

    it("can accept both `Request` and `CreateFreshContextOptions`", async () => {
      const req = new Request("http://localhost:8020/users/5678");
      const ctx = createFreshContext(req, {
        params: { id: "5678" },
        state: { key: "value" },
        data: { user: "barbaz" },
        destination: "route",
        response: () => Promise.resolve(new Response("OK")),
        responseNotFound: () =>
          Promise.resolve(
            new Response("NotFound", {
              status: 404,
            }),
          ),
      });
      assertContextHasServerInfoForRequest(ctx, req);
      assertEquals(ctx.params, { id: "5678" });
      assertEquals(ctx.state, { key: "value" });
      assertEquals(ctx.data, { user: "barbaz" });
      assertEquals(ctx.route, "/");
      assertEquals(ctx.url.href, "http://localhost:8020/users/5678");
      assertEquals(ctx.destination, "route");

      const res = await ctx.render();
      await assertDefaultResponseAsync(res);

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);
      assertEquals(await resNotFound.text(), "NotFound");

      const res2 = await ctx.next();
      await assertDefaultResponseAsync(res2);
    });

    it("can infer `params` and `destination` from `Request` based on `manifest` option", async () => {
      const manifest = await loadManifest();

      {
        const req = new Request("http://localhost:8002/api/users/123");
        const ctx = createFreshContext(req, { manifest });
        assertEquals(ctx.params, { id: "123" });
        assertEquals(ctx.state, {});
        assertEquals(ctx.route, "/api/users/:id");
        assertEquals(ctx.destination, "route");
        assertContextHasServerInfoForRequest(ctx, req);
      }

      {
        const req = new Request("https://localhost:8000/api/users/123");
        const ctx = createFreshContext(req, {
          manifest,
          params: { id: "9876" },
        });
        assertEquals(ctx.params, { id: "9876" });
        assertEquals(ctx.route, "/api/users/:id");
        assertEquals(ctx.destination, "route");
      }

      {
        const req = new Request("https://localhost:8000/no/such/route");
        const ctx = createFreshContext(req, { manifest });
        assertEquals(ctx.params, {});
        assertEquals(ctx.route, "/");
        assertEquals(ctx.destination, "notFound");
      }
    });

    it("can render a page component from `Request` based on `manifest` option", async () => {
      const manifest = await loadManifest();
      const req = new Request("http://localhost:8003/users/1");
      const state = { users: createInMemoryUsers() };
      const ctx = createFreshContext(req, { manifest, state });
      const res = await ctx.render();
      assertEquals(res.status, 200);
      assertEquals(res.headers.get("Content-Type"), "text/html; charset=UTF-8");

      const $ = cheerio.load(await res.text());
      const $dd = $("dd");
      const expected = await state.users.getByID(1);
      assertEquals($dd.length, 3);
      assertEquals($dd.eq(0).text(), "1");
      assertEquals($dd.eq(1).text(), expected.name);
      assertEquals($dd.eq(2).text(), expected.email);
    });
  });

  describe("createRouteContext", () => {
    it("returns a `RouteContext` which is a subset of a `FreshContext`", async () => {
      function removeMethods<T extends RouteContext | FreshContext>(
        ctx: T,
      ): Record<keyof T, unknown> {
        const result = {} as Record<keyof T, unknown>;
        for (const key in ctx) {
          if (typeof ctx[key] !== "function") {
            result[key] = ctx[key];
          }
        }
        return result;
      }
      const routeCtx = createRouteContext();
      const freshCtx = createFreshContext();
      assertEquals(removeMethods(routeCtx), removeMethods(freshCtx));
    });
  });

  describe("createHandlerContext", () => {
    it("is an alias of `createFreshContext`", () => {
      assertEquals(createHandlerContext, createFreshContext);
    });
  });

  describe("createMiddlewareHandlerContext", () => {
    it("is an alias of `createFreshContext`", () => {
      assertEquals(createMiddlewareHandlerContext, createFreshContext);
    });
  });
});

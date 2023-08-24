import type {
  HandlerContext,
  MiddlewareHandlerContext,
} from "$fresh/server.ts";
import {
  createHandlerContext,
  createMiddlewareHandlerContext,
} from "$fresh-testing-library/server.ts";
import { handler } from "🗺/api/users/[id].ts";
import { createLoggerMiddleware } from "🗺/(_middlewares)/logger.ts";

import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { describe, it } from "$std/testing/bdd.ts";

const defaultDummyLocalPort = 8020;
const defaultDummyRemotePort = 49152;

describe("$fresh-testing-library/server", () => {
  describe("createHandlerContext", () => {
    it("returns `HandlerContext` which can be passed to fresh handlers", async () => {
      assert(handler.GET);

      const req = new Request("http://localhost:3000/api/users/1");
      const ctx = createHandlerContext(req, { params: { id: "1" } });
      const res = await handler.GET(req, ctx);
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "bob");
    });

    it("can accept `Request`", () => {
      const req = new Request("http://localhost:8019");
      const ctx = createHandlerContext(req);
      assertContextHasServerInfoForRequest(ctx, req);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});
    });

    it("can accept an empty object", async () => {
      const ctx = createHandlerContext({});
      assertContextHasDefaultServerInfo(ctx);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});

      const res = await ctx.render();
      await assertDefaultResponseAsync(res);

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);
    });

    it("works with no arguments", async () => {
      const ctx = createHandlerContext();
      assertContextHasDefaultServerInfo(ctx);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});

      const res = await ctx.render();
      await assertDefaultResponseAsync(res);

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);
    });

    it("can accept `CreateHandlerContextOptions`", async () => {
      const ctx = createHandlerContext({
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
        response: new Response("foobar"),
        responseNotFound: new Response("This page is not found.", {
          status: 404,
        }),
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

      const res = await ctx.render();
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "foobar");

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);
      assertEquals(await resNotFound.text(), "This page is not found.");
    });

    it("can accept both `Request` and `CreateHandlerContextOptions`", async () => {
      const req = new Request("http://localhost:8020/users/5678");
      const ctx = createHandlerContext(req, {
        params: { id: "5678" },
        state: { key: "value" },
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

      const res = await ctx.render();
      await assertDefaultResponseAsync(res);

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);
      assertEquals(await resNotFound.text(), "NotFound");
    });

    it("can extract params from `Request` based on `manifest` option", async () => {
      const manifest = await loadManifest();

      {
        const req = new Request("http://localhost:8002/api/users/123");
        const ctx = createHandlerContext(req, { manifest });
        assertEquals(ctx.params, { id: "123" });
        assertEquals(ctx.state, {});
        assertContextHasServerInfoForRequest(ctx, req);
      }

      {
        const req = new Request("https://localhost:8000/api/users/123");
        const ctx = createHandlerContext(req, {
          manifest,
          params: { id: "9876" },
        });
        assertEquals(ctx.params, { id: "9876" });
      }

      {
        const req = new Request("https://localhost:8000/no/such/route");
        const ctx = createHandlerContext(req, { manifest });
        assertEquals(ctx.params, {});
      }
    });
  });

  describe("createMiddlewareHandlerContext", () => {
    it("returns `MiddlwareHandlerContext` which can be passed to fresh middlewares", async () => {
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
      const ctx = createMiddlewareHandlerContext(req, { manifest });
      await middleware(req, ctx);
      assertEquals(messages, [
        `<-- GET ${path}`,
        `--> GET ${path} 200`,
      ]);
    });

    it("can accept `Request`", () => {
      const req = new Request("http://localhost:8019");
      const ctx = createMiddlewareHandlerContext(req);
      assertContextHasServerInfoForRequest(ctx, req);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});
      assertEquals(ctx.destination, "notFound");
    });

    it("can accept an empty object", async () => {
      const ctx = createMiddlewareHandlerContext({});
      assertContextHasDefaultServerInfo(ctx);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});
      assertEquals(ctx.destination, "notFound");

      const res = await ctx.next();
      await assertDefaultResponseAsync(res);
    });

    it("works with no arguments", async () => {
      const ctx = createMiddlewareHandlerContext();
      assertContextHasDefaultServerInfo(ctx);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});
      assertEquals(ctx.destination, "notFound");

      const res = await ctx.next();
      await assertDefaultResponseAsync(res);
    });

    it("can accept `CreateMiddlewareHandlerContextOptions`", async () => {
      const ctx = createMiddlewareHandlerContext({
        localAddr: {
          transport: "tcp",
          hostname: "127.0.0.1",
          port: 3001,
        },
        remoteAddr: {
          transport: "tcp",
          hostname: "localhost",
          port: 50001,
        },
        params: { filename: "test.txt" },
        state: { user: "foobar" },
        response: new Response("testing"),
        destination: "static",
      });
      assert(ctx.localAddr);
      assert(ctx.localAddr.transport === "tcp");
      assertEquals(ctx.localAddr.hostname, "127.0.0.1");
      assertEquals(ctx.localAddr.port, 3001);
      assert(ctx.remoteAddr.transport === "tcp");
      assertEquals(ctx.remoteAddr.hostname, "localhost");
      assertEquals(ctx.remoteAddr.port, 50001);
      assertEquals(ctx.params, { filename: "test.txt" });
      assertEquals(ctx.state, { user: "foobar" });
      assertEquals(ctx.destination, "static");

      const res = await ctx.next();
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "testing");
    });

    it("can accept both `Request` and `CreateMiddlewareHandlerContextOptions`", async () => {
      const req = new Request("http://localhost:8021/books/924");
      const ctx = createMiddlewareHandlerContext(req, {
        params: { id: "924" },
        state: { num: 12345 },
        response: new Response("dummy response"),
        destination: "route",
      });
      assertContextHasServerInfoForRequest(ctx, req);
      assertEquals(ctx.params, { id: "924" });
      assertEquals(ctx.state, { num: 12345 });
      assertEquals(ctx.destination, "route");

      const res = await ctx.next();
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "dummy response");
    });

    it("can extract params from `Request` and infer `destination` based on `manifest` option", async () => {
      const manifest = await loadManifest();

      {
        const req = new Request("http://localhost:8003/api/users/9999");
        const ctx = createMiddlewareHandlerContext(req, { manifest });
        assertEquals(ctx.params, { id: "9999" });
        assertEquals(ctx.state, {});
        assertEquals(ctx.destination, "route");
        assertContextHasServerInfoForRequest(ctx, req);
      }

      {
        const req = new Request("https://localhost:8004/api/users/879");
        const ctx = createMiddlewareHandlerContext(req, {
          manifest,
          params: { id: "123456" },
        });
        assertEquals(ctx.params, { id: "123456" });
        assertEquals(ctx.destination, "route");
      }

      {
        const req = new Request("https://localhost:8005/no/such/route");
        const ctx = createMiddlewareHandlerContext(req, { manifest });
        assertEquals(ctx.params, {});
        assertEquals(ctx.destination, "notFound");
      }
    });
  });
});

async function loadManifest() {
  const { default: manifest } = await import("./demo/fresh.gen.ts");
  return manifest;
}

function assertContextHasDefaultServerInfo(
  ctx: HandlerContext | MiddlewareHandlerContext,
) {
  assert(ctx.localAddr);
  assert(ctx.localAddr.transport === "tcp");
  assertEquals(ctx.localAddr.hostname, "localhost");
  assertEquals(ctx.localAddr.port, defaultDummyLocalPort);
  assert(ctx.remoteAddr.transport === "tcp");
  assertEquals(ctx.remoteAddr.hostname, "localhost");
  assertEquals(ctx.remoteAddr.port, defaultDummyRemotePort);
}

function assertContextHasServerInfoForRequest(
  ctx: HandlerContext | MiddlewareHandlerContext,
  req: Request,
) {
  const url = new URL(req.url);
  const port = Number.parseInt(url.port);
  assert(ctx.localAddr);
  assert(ctx.localAddr.transport === "tcp");
  assertEquals(ctx.localAddr.hostname, url.hostname);
  assertEquals(ctx.localAddr.port, port);
  assert(ctx.remoteAddr.transport === "tcp");
  assertEquals(ctx.remoteAddr.hostname, url.hostname);
  assertEquals(ctx.remoteAddr.port, defaultDummyRemotePort);
}

async function assertDefaultResponseAsync(res: Response) {
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "OK");
}

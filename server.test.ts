import { createHandlerContext } from "./server.ts";
import { handler } from "🗺/api/users/[id].ts";

import { assert, assertEquals } from "$std/testing/asserts.ts";
import { describe, it } from "$std/testing/bdd.ts";

const defaultDummyLocalPort = 8020;
const defaultDummyRemotePort = 49152;

describe("$fresh-testing-library/server", () => {
  describe("createHandlerContext", () => {
    it("returns `HandlerContext` which can be passed to the fresh handler", async () => {
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
      assert(ctx.localAddr.transport === "tcp");
      assertEquals(ctx.localAddr.hostname, "localhost");
      assertEquals(ctx.localAddr.port, 8019);
      assert(ctx.remoteAddr.transport === "tcp");
      assertEquals(ctx.remoteAddr.hostname, "localhost");
      assertEquals(ctx.remoteAddr.port, defaultDummyRemotePort);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});
    });

    it("can accept an empty object", async () => {
      const ctx = createHandlerContext({});
      assert(ctx.localAddr.transport === "tcp");
      assertEquals(ctx.localAddr.hostname, "localhost");
      assertEquals(ctx.localAddr.port, defaultDummyLocalPort);
      assert(ctx.remoteAddr.transport === "tcp");
      assertEquals(ctx.remoteAddr.hostname, "localhost");
      assertEquals(ctx.remoteAddr.port, defaultDummyRemotePort);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});

      const res = await ctx.render();
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "OK");

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);
    });

    it("works with no arguments", async () => {
      const ctx = createHandlerContext();
      assert(ctx.localAddr.transport === "tcp");
      assertEquals(ctx.localAddr.hostname, "localhost");
      assertEquals(ctx.localAddr.port, defaultDummyLocalPort);
      assert(ctx.remoteAddr.transport === "tcp");
      assertEquals(ctx.remoteAddr.hostname, "localhost");
      assertEquals(ctx.remoteAddr.port, defaultDummyRemotePort);
      assertEquals(ctx.params, {});
      assertEquals(ctx.state, {});

      const res = await ctx.render();
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "OK");

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
      const req = new Request("http://localhost:8019/users/5678");
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
      assert(ctx.localAddr.transport === "tcp");
      assertEquals(ctx.localAddr.hostname, "localhost");
      assertEquals(ctx.localAddr.port, 8019);
      assert(ctx.remoteAddr.transport === "tcp");
      assertEquals(ctx.remoteAddr.hostname, "localhost");
      assertEquals(ctx.remoteAddr.port, defaultDummyRemotePort);
      assertEquals(ctx.params, { id: "5678" });
      assertEquals(ctx.state, { key: "value" });

      const res = await ctx.render();
      assertEquals(res.status, 200);
      assertEquals(await res.text(), "OK");

      const resNotFound = await ctx.renderNotFound();
      assertEquals(resNotFound.status, 404);
      assertEquals(await resNotFound.text(), "NotFound");
    });
  });
});

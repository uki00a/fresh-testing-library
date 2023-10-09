import type {
  HandlerContext,
  MiddlewareHandlerContext,
  RouteContext,
} from "$fresh/server.ts";

import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";

const defaultDummyLocalPort = 8020;
const defaultDummyRemotePort = 49152;

export async function loadManifest() {
  const { default: manifest } = await import("../../demo/fresh.gen.ts");
  return manifest;
}

export function assertContextHasDefaultServerInfo(
  ctx: HandlerContext | MiddlewareHandlerContext | RouteContext,
) {
  assert(ctx.localAddr);
  assert(ctx.localAddr.transport === "tcp");
  assertEquals(ctx.localAddr.hostname, "localhost");
  assertEquals(ctx.localAddr.port, defaultDummyLocalPort);
  assert(ctx.remoteAddr.transport === "tcp");
  assertEquals(ctx.remoteAddr.hostname, "localhost");
  assertEquals(ctx.remoteAddr.port, defaultDummyRemotePort);
}

export function assertContextHasServerInfoForRequest(
  ctx: HandlerContext | MiddlewareHandlerContext | RouteContext,
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

export async function assertDefaultResponseAsync(res: Response) {
  assertEquals(res.status, 200);
  assertEquals(await res.text(), "OK");
}

import { createFreshContext } from "$fresh-testing-library/server.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { describe, it } from "$std/testing/bdd.ts";

import { createLoggerMiddleware } from "$/routes/(_middlewares)/logger.ts";
import manifest from "$/fresh.gen.ts";

describe("createLoggerMiddleware", () => {
  it("returns a middleware which logs the information about each request", async () => {
    const messages: Array<string> = [];
    const testingLogger = {
      info(...args: Array<unknown>) {
        messages.push(args.map(String).join(""));
      },
    };
    const middleware = createLoggerMiddleware(testingLogger);
    const path = `/api/users/123`;
    const req = new Request(`http://localhost:3000${path}`);
    const ctx = createFreshContext(req, { manifest });
    await middleware(req, ctx);
    assertEquals(messages, [
      `<-- GET ${path}`,
      `--> GET ${path} 200`,
    ]);
  });
});

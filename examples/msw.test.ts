import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { expect } from "$fresh-testing-library/expect.ts";
import { afterAll, beforeAll, describe, it } from "$std/testing/bdd.ts";

// You should pass `--location` flag.
expect(location).toBeTruthy();

describe("msw", () => {
  const server = setupServer(
    http.get(`${location.origin}/api/user`, () =>
      HttpResponse.json({
        id: 1,
        name: "foo",
      })),
  );

  beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
  afterAll(() => server.close());

  it("can be used to intercept requests", async () => {
    const res = await fetch("/api/user");
    expect(await res.json()).toEqual({ id: 1, name: "foo" });
  });
});

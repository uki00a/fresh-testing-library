import { assertEquals } from "$std/assert/assert_equals.ts";
import { describe, it } from "$std/testing/bdd.ts";
import type { Has } from "$std/testing/types.ts";
import { assertType } from "$std/testing/types.ts";

import {
  determineRoute,
  determineRouteDestinationKind,
  findMatchingRouteFromManifest,
  freshPathToURLPattern,
} from "./mod.ts";

describe("$fresh-testing-library/_util", () => {
  describe("freshPathToURLPattern", () => {
    it("is properly typed", () => {
      type Args = Parameters<typeof freshPathToURLPattern>;
      assertType<Has<["./routes/index.tsx"], Args>>(true);
      assertType<Has<["./routes/users/[id].tsx"], Args>>(true);
      assertType<Has<["/api/users/123"], Args>>(false);
      assertType<Has<["/routes/users/[id].tsx"], Args>>(false);
    });

    it("converts a Fresh path pattern to a URLPattern", async (t) => {
      for (
        const [given, expected] of [
          ["/api/users/[id]", "/api/users/:id"],
          ["/api/users/[id].ts", "/api/users/:id"],
          [
            "/api/rooms/[roomID]/messages/[messageID].tsx",
            "/api/rooms/:roomID/messages/:messageID",
          ],
          ["./routes/[name].tsx", "/:name"],
          ["./routes/index.tsx", "/"],
          ["./routes/about/index.tsx", "/about"],
          ["./routes/faq.tsx", "/faq"],
          ["./routes/files/[...path]", "/files/:path+"],
          ["./routes/files/[...path].tsx", "/files/:path+"],
          ["./routes/files/[...path]/view.tsx", "/files/:path+/view"],
        ]
      ) {
        await t.step(
          `freshPathToURLPattern("${given}") returns "${expected}"`,
          () => {
            // @ts-expect-error This is intended
            const actual = freshPathToURLPattern(given);
            assertEquals(actual.pathname, expected);
          },
        );
      }
    });
  });

  describe("determineRoute", () => {
    it("should return `/` when `manifest` parameter is not provided", () => {
      const request = new Request("http://localhost:9876/api/users/1234");
      assertEquals(determineRoute(request), "/");
    });

    it("should return a `path-to-regexp` pattern based on `manifest`", async () => {
      const request = new Request("http://localhost:9876/api/users/1234");
      const manifest = await loadManifest();
      assertEquals(determineRoute(request, manifest), "/api/users/:id");
    });
  });

  describe("determineRouteDestinationKind", () => {
    for (
      const [given, expected] of [
        ["/_frsh/refresh.js", "internal"],
        ["/api/users/1234", "route"],
        ["/api/users/1234/foo", "notFound"],
      ]
    ) {
      it(`should return "${expected}" for "${given}"`, async () => {
        const manifest = await loadManifest();
        assertEquals(determineRouteDestinationKind(given, manifest), expected);
      });
    }
  });

  describe("findMatchingRouteFromManifest", () => {
    it(`should return the maching route`, async () => {
      const request = new Request("http://localhost:9876/users/9876");
      const manifest = await loadManifest();
      const route = findMatchingRouteFromManifest(request, manifest);
      assertEquals(route, manifest.routes["./routes/users/[id].tsx"]);
    });

    it(`should return \`null\` when no route matches`, async () => {
      const request = new Request("http://localhost:9876/users/9876/foo");
      const manifest = await loadManifest();
      const route = findMatchingRouteFromManifest(request, manifest);
      assertEquals(route, null);
    });
  });
});

async function loadManifest() {
  const { default: manifest } = await import("../../demo/fresh.gen.ts");
  return manifest;
}

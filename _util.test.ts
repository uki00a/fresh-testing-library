import { assertEquals } from "$std/assert/assert_equals.ts";
import { describe, it } from "$std/testing/bdd.ts";

import { freshPathToURLPattern } from "./_util.ts";

describe("$fresh-testing-library/_util", () => {
  describe("freshPathToURLPattern", () => {
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
            const actual = freshPathToURLPattern(given);
            assertEquals(actual.pathname, expected);
          },
        );
      }
    });
  });
});

import { expect, fn } from "./expect.ts";
import { JestAssertionError } from "./deps/expect.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { assertThrows } from "$std/assert/assert_throws.ts";

Deno.test({
  name: "expect",
  fn: async (t) => {
    await t.step("basic assertions", () => {
      expect(1).toBe(1);
      assertThrows(() => expect(1).toBe(2), JestAssertionError);
    });

    await t.step(
      "supports matchers provided by `@testing-library/jest-dom`",
      () => {
        assertExists(
          expect(null).toBeInTheDocument,
          "`.toBeInTheDocument()` should be defined.",
        );
      },
    );

    await t.step("mocks", () => {
      const inc = fn((n: number) => 1 + n);
      expect(inc).not.toBeCalled();
      expect(inc(4)).toBe(5);
      expect(inc).toBeCalled();
      expect(inc).toBeCalledTimes(1);
      expect(inc).toBeCalledWith(4);
    });
  },
  permissions: "none",
});

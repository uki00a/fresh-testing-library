import { expect } from "./expect.ts";
import { JestAssertionError } from "./deps/expect.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { assertThrows } from "$std/assert/assert_throws.ts";

Deno.test({
  name: "expect",
  fn: () => {
    expect(1).toBe(1);
    assertThrows(() => expect(1).toBe(2), JestAssertionError);
    assertExists(
      expect(null).toBeInTheDocument,
      "`.toBeInTheDocument()` should be defined.",
    );
  },
  permissions: "none",
});

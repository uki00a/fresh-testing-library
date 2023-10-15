import { expect } from "./expect.ts";
import { JestAssertionError } from "./deps/expect.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { assertThrows } from "$std/assert/assert_throws.ts";
import { fn } from "https://esm.sh/jest-mock@29.7.0?pin=v133";

Deno.test({
  name: "expect",
  fn: () => {
    expect(1).toBe(1);
    assertThrows(() => expect(1).toBe(2), JestAssertionError);
    assertExists(
      expect(null).toBeInTheDocument,
      "`.toBeInTheDocument()` should be defined.",
    );

    const inc = fn((n: number) => 1 + n);
    expect(inc).not.toBeCalled();
    expect(inc(4)).toBe(5);
    expect(inc).toBeCalled();
    expect(inc).toBeCalledTimes(1);
    expect(inc).toBeCalledWith(4);
  },
  permissions: "none",
});

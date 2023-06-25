import { cleanup, fireEvent, render, setup } from "$fresh-testing-library";
import { signal } from "@preact/signals";
import {
  assertEquals,
  assertExists,
  assertFalse,
} from "$std/testing/asserts.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";

import Counter from "./demo/islands/Counter.tsx";

describe("islands/Counter.tsx", () => {
  beforeAll(setup);
  afterEach(cleanup);

  it("should work", async () => {
    const count = signal(9);
    const screen = render(<Counter count={count} />);
    const plusOne = screen.getByRole("button", { name: "+1" });
    const minusOne = screen.getByRole("button", { name: "-1" });
    assertExists(screen.queryByText("9"));

    await fireEvent.click(plusOne);
    assertFalse(screen.queryByText("9"));
    assertExists(screen.queryByText("10"));

    await fireEvent.click(minusOne);
    assertExists(screen.queryByText("9"));
    assertFalse(screen.queryByText("10"));
  });
});

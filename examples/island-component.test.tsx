import {
  cleanup,
  render,
  setup,
  userEvent,
} from "$fresh-testing-library/components.ts";
import { expect } from "$fresh-testing-library/expect.ts";
import { signal } from "@preact/signals";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";

import Counter from "🏝️/Counter.tsx";
import { default as manifest } from "$/fresh.gen.ts";

describe("islands/Counter.tsx", () => {
  beforeAll(() => setup({ manifest }));
  afterEach(cleanup);

  it("should work", async () => {
    const count = signal(9);
    const user = userEvent.setup();
    const screen = render(<Counter count={count} />);
    const plusOne = screen.getByRole("button", { name: "+1" });
    const minusOne = screen.getByRole("button", { name: "-1" });
    expect(screen.getByText("9")).toBeInTheDocument();

    await user.click(plusOne);
    expect(screen.queryByText("9")).not.toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();

    await user.click(minusOne);
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.queryByText("10")).not.toBeInTheDocument();
  });
});

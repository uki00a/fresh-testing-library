import {
  cleanup,
  expect,
  render,
  setup,
  userEvent,
  waitFor,
} from "$fresh-testing-library";
import { computed, signal, useSignal } from "@preact/signals";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";

import Counter from "🏝️/Counter.tsx";
import { default as manifest } from "./demo/fresh.gen.ts";

describe("$fresh-testing-library/components", () => {
  beforeAll(() => setup({ manifest }));
  afterEach(cleanup);

  it("provides a thin wrapper to `@testing-library/preact` and `@testing-library/user-event`", async () => {
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

  it("supports changing the `src` of the `img` element", async () => {
    // Regression test for https://github.com/uki00a/fresh-testing-library/issues/22
    const images = [
      "https://avatars.githubusercontent.com/u/35212662?v=4",
      "https://avatars.githubusercontent.com/u/42048915?v=4",
    ];
    function Test() {
      const indexOfCurrentImage = useSignal(0);
      const currentImage = computed(() => images[indexOfCurrentImage.value]);
      const switchToNextImage = () => {
        indexOfCurrentImage.value = indexOfCurrentImage.value +
          1 % images.length;
      };
      return (
        <>
          <img src={currentImage.value} />
          <button type="button" onClick={switchToNextImage}>➡️</button>
        </>
      );
    }

    const user = userEvent.setup();
    const screen = render(<Test />);
    const img = screen.getByRole("img");
    const button = screen.getByRole("button", { name: "➡️" });

    expect(img).toHaveAttribute("src", images[0]);
    await user.click(button);
    expect(img).toHaveAttribute("src", images[1]);
  });

  it("supports Clipboard API", async () => {
    // Regression test for https://github.com/uki00a/fresh-testing-library/issues/29
    function Test({ text }: { text: string }) {
      const onClick = () => {
        navigator.clipboard.writeText(text);
      };

      return <button type="button" onClick={onClick}>COPY</button>;
    }

    const text = "It works.";
    const user = userEvent.setup();
    const screen = render(<Test text={text} />);
    const button = screen.getByRole("button", { name: "COPY" });
    await user.click(button);
    await waitFor(async () => {
      expect(await navigator.clipboard.readText()).toBe(text);
    });
  });
});

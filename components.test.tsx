import {
  cleanup,
  render,
  setup,
  userEvent,
  waitFor,
} from "$fresh-testing-library";
import { computed, signal, useSignal } from "@preact/signals";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { assertFalse } from "$std/assert/assert_false.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";

import Counter from "🏝️/Counter.tsx";

describe("$fresh-testing-library/components", () => {
  beforeAll(setup);
  afterEach(cleanup);

  it("provides a thin wrapper to `@testing-library/preact` and `@testing-library/user-event`", async () => {
    const count = signal(9);
    const user = userEvent.setup();
    const screen = render(<Counter count={count} />);
    const plusOne = screen.getByRole("button", { name: "+1" });
    const minusOne = screen.getByRole("button", { name: "-1" });
    assertExists(screen.getByText("9"));

    await user.click(plusOne);
    assertFalse(screen.queryByText("9"));
    assertExists(screen.getByText("10"));

    await user.click(minusOne);
    assertExists(screen.getByText("9"));
    assertFalse(screen.queryByText("10"));
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

    assertEquals(img.getAttribute("src"), images[0]);
    await user.click(button);
    assertEquals(img.getAttribute("src"), images[1]);
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
      assertEquals(await navigator.clipboard.readText(), text);
    });
  });
});

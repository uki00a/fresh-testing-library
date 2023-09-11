import { cleanup, fireEvent, render, setup } from "$fresh-testing-library";
import { computed, signal, useSignal } from "@preact/signals";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { assertFalse } from "$std/assert/assert_false.ts";
import { afterEach, beforeAll, describe, it } from "$std/testing/bdd.ts";

import Counter from "🏝️/Counter.tsx";

describe("$fresh-testing-library/components", () => {
  beforeAll(setup);
  afterEach(cleanup);

  it("provides a thin wrapper to `@testing-library/preact`", async () => {
    const count = signal(9);
    const screen = render(<Counter count={count} />);
    const plusOne = screen.getByRole("button", { name: "+1" });
    const minusOne = screen.getByRole("button", { name: "-1" });
    assertExists(screen.getByText("9"));

    await fireEvent.click(plusOne);
    assertFalse(screen.queryByText("9"));
    assertExists(screen.getByText("10"));

    await fireEvent.click(minusOne);
    assertExists(screen.getByText("9"));
    assertFalse(screen.queryByText("10"));
  });
});

describe("Changing the `src` of the `img` element", () => {
  // Regression test for https://github.com/uki00a/fresh-testing-library/issues/22
  beforeAll(setup);
  afterEach(cleanup);

  it("should work", async () => {
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

    const screen = render(<Test />);
    const img = screen.getByRole("img");
    const button = screen.getByRole("button", { name: "➡️" });

    assertEquals(img.getAttribute("src"), images[0]);
    await fireEvent.click(button);
    assertEquals(img.getAttribute("src"), images[1]);
  });
});

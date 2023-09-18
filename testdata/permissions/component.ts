import { h } from "preact";
import { cleanup, render, setup } from "$fresh-testing-library/components.ts";

setup();
try {
  const screen = render(h("div", {}));
  screen.queryByText("foo");
} finally {
  cleanup();
}

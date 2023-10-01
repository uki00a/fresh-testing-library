/**
 * A thin wrapper to
 * [@testing-library/preact]{@link https://github.com/testing-library/preact-testing-library}
 * for testing island components.
 *
 * @module
 */
import { JSDOM } from "./deps/jsdom.ts";
import { setUpClipboard } from "./deps/jest-clipboard.ts";

export * from "./deps/preact-testing-library.ts";

import vm from "node:vm";

function createJSDOM() {
  const isContext = vm.isContext;
  vm.isContext = () => false;
  const jsdom = new JSDOM();
  vm.isContext = isContext;
  return jsdom;
}

export function setup() {
  if (globalThis.document) return;

  const jsdom = createJSDOM();
  const { document } = jsdom.window;
  globalThis.document = document;
  setUpClipboard();
}

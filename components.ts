export * from "./deps/preact-testing-library.ts";
import { JSDOM } from "./deps/jsdom.ts";

import vm from "node:vm";

export function setup() {
  if (globalThis.document) return;

  const isContext = vm.isContext;
  vm.isContext = () => false;

  const { document } = new JSDOM().window;
  globalThis.document = document;

  vm.isContext = isContext;
}

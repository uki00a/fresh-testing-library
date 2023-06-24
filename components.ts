export * from "https://esm.sh/@testing-library/preact@3.2.3/pure?external=preact";
import { JSDOM } from "https://esm.sh/jsdom@22.1.0?no-dts";

import vm from "node:vm";

export function setup() {
  if (globalThis.document) return;

  const isContext = vm.isContext;
  vm.isContext = () => false;

  const { document } = new JSDOM().window;
  globalThis.document = document;

  vm.isContext = isContext;
}

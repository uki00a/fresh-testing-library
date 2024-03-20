import { JSDOM } from "../../deps/jsdom.ts";
export function createDocument(maybeHTML?: string): Document {
  const jsdom = new JSDOM(maybeHTML);
  const { document } = jsdom.window;
  return document;
}

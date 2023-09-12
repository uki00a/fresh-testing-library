import { parseMarkdown } from "./deps/deno-power-doctest.ts";
import { dirname, join } from "node:path";

const readmeURL = new URL(import.meta.resolve("./README.md"));
const readme = await Deno.readTextFile(readmeURL);
const baseDir = dirname(readmeURL.pathname);
const blocks = parseMarkdown(readme);
for (const x of blocks) {
  const { range: { start: { line: start }, end: { line: end } } } = x;
  const filename = join(baseDir, `README\$${start}-${end}.doctest.tsx`);
  await Deno.writeTextFile(filename, x.code);
  try {
    await import(filename);
  } finally {
    await Deno.remove(filename);
  }
}

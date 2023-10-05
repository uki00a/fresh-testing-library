import { parseMarkdown, runCodeBlocks } from "./deps/deno-power-doctest.ts";

const readmeURL = new URL(import.meta.resolve("./README.md"));
const readme = await Deno.readTextFile(readmeURL);
const blocks = parseMarkdown(readme);
await runCodeBlocks(blocks);

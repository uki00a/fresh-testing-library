import {
  parseMarkdown,
  parseTypeScript,
  runCodeBlocks,
  testCodeBlocks,
} from "./deps/deno-power-doctest.ts";

{
  // Run test cases written in `README.md`.
  const readmeURL = new URL(import.meta.resolve("./README.md"));
  const readme = await Deno.readTextFile(readmeURL);
  const blocks = parseMarkdown(readme);
  await runCodeBlocks(blocks);
}

Deno.test("[doctest] server.ts", async (t) => {
  const url = new URL(import.meta.resolve("./server.ts"));
  const content = await Deno.readTextFile(url);
  const blocks = parseTypeScript(content);
  await testCodeBlocks(t, blocks, { path: url.pathname });
});

import { assertNotStrictEquals } from "$std/assert/assert_not_strict_equals.ts";
import { assertStrictEquals } from "$std/assert/assert_strict_equals.ts";
import { JSDOM } from "../../deps/jsdom.ts";
import { extractPartialBoundaries } from "$fresh-testing-library/internal/fresh/partials.ts";

Deno.test("extractPartialBoundaries", () => {
  const document = new JSDOM(`
<html>
<body>
<h1>hello</h1>
<main>
  <!-- test -->
  <div>foo</div>
  <!--frsh-partial:page:0:-->
  <section>
    <h2>Test page</h2>
    <div>hi!</div>
  </section>
  <!--/frsh-partial:page:0:-->
</main>
</body>
</html>`).window.document;
  const boundaries = extractPartialBoundaries(document);
  assertStrictEquals(boundaries[0].name, "page");
  assertStrictEquals(boundaries[0].index, 0);
  assertNotStrictEquals(boundaries[0].start, boundaries[0].end);
  assertStrictEquals(
    boundaries[0].start.parentNode,
    boundaries[0].end.parentNode,
  );

  assertStrictEquals(boundaries.length, 1);
});

import { assertNotStrictEquals } from "$std/assert/assert_not_strict_equals.ts";
import { assertStrictEquals } from "$std/assert/assert_strict_equals.ts";
import {
  createPartialMarkerComment,
  extractPartialBoundaries,
} from "./partials.ts";
import { createDocument } from "../jsdom/mod.ts";

Deno.test("createPartialMarkerComment", () => {
  assertStrictEquals(
    createPartialMarkerComment({ name: "counter", index: 0 }),
    "frsh-partial:counter:0:",
  );
  assertStrictEquals(
    createPartialMarkerComment({ name: "snackbar", index: 0, endMarker: true }),
    "/frsh-partial:snackbar:0:",
  );
});

Deno.test("extractPartialBoundaries", () => {
  const document = createDocument(`
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
</html>`);
  const boundaries = extractPartialBoundaries(document);
  assertStrictEquals(boundaries[0].name, "page");
  assertStrictEquals(boundaries[0].key, "0");
  assertNotStrictEquals(boundaries[0].start, boundaries[0].end);
  assertStrictEquals(
    boundaries[0].start.parentNode,
    boundaries[0].end.parentNode,
  );

  assertStrictEquals(boundaries.length, 1);
});

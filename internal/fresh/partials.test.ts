import { assertExists } from "$std/assert/assert_exists.ts";
import { assertNotStrictEquals } from "$std/assert/assert_not_strict_equals.ts";
import { assertStrictEquals } from "$std/assert/assert_strict_equals.ts";
import { assertSpyCallArgs, assertSpyCalls, spy } from "$std/testing/mock.ts";
import {
  createPartialMarkerComment,
  enablePartialNavigation,
  extractPartialBoundaries,
} from "./partials.ts";
import { createDocument } from "../jsdom/mod.ts";

Deno.test({
  name: "createPartialMarkerComment",
  permissions: "none",
  fn: () => {
    assertStrictEquals(
      createPartialMarkerComment({ name: "counter", index: 0 }),
      "frsh-partial:counter:0:",
    );
    assertStrictEquals(
      createPartialMarkerComment({
        name: "snackbar",
        index: 0,
        endMarker: true,
      }),
      "/frsh-partial:snackbar:0:",
    );
  },
});

Deno.test({
  name: "extractPartialBoundaries",
  permissions: "none",
  fn: () => {
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
  },
});

Deno.test({
  name: "enablePartialNavigation",
  permissions: "none",
  fn: async (t) => {
    await t.step("supports <button>", () => {
      const buttonWithFpartialId = "button-with-f-partial";
      const buttonWithoutFpartialId = "button-without0f-partial";
      const partialLink = "/pages/foo";
      const doc = createDocument(`<div id="container">
  <button id="${buttonWithFpartialId}" f-partial="${partialLink}">with f-partial</button>
  <button id="${buttonWithoutFpartialId}">without f-partial</button>
</div>`);
      const container = doc.getElementById("container");
      assertExists(container);
      const updatePartials = spy<unknown, [Event, Request], Promise<unknown>>();
      const origin = "http://localhost:8000";
      enablePartialNavigation(
        container,
        origin,
        updatePartials,
      );
      assertSpyCalls(updatePartials, 0);
      {
        const buttonWithoutFpartial = doc.getElementById(
          buttonWithoutFpartialId,
        );
        assertExists(buttonWithoutFpartial);
        buttonWithoutFpartial.click();
        assertSpyCalls(updatePartials, 0);
      }

      {
        const buttonWithFpartial = doc.getElementById(buttonWithFpartialId);
        assertExists(buttonWithFpartial);
        buttonWithFpartial.click();
        assertSpyCalls(updatePartials, 1);
        const [{ args: [event, request] }] = updatePartials.calls;
        assertStrictEquals(event.type, "click");
        assertStrictEquals(request.method, "GET");
        assertStrictEquals(
          request.url,
          `${origin}${partialLink}?fresh-partial=true`,
        );
      }
    });
  },
});

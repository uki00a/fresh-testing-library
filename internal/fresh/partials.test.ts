import { assert } from "$std/assert/assert.ts";
import { assertExists } from "$std/assert/assert_exists.ts";
import { assertNotStrictEquals } from "$std/assert/assert_not_strict_equals.ts";
import { assertStrictEquals } from "$std/assert/assert_strict_equals.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { assertSpyCalls, spy } from "$std/testing/mock.ts";
import {
  applyResponseToDocument,
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
    assertStrictEquals(boundaries[0].key, "");
    assertStrictEquals(boundaries[0].replacementMode, "replace");
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
    await t.step("enables partial navigation for `<a>`", () => {
      const anchorWithFpartialId = crypto.randomUUID();
      const anchorWithoutFpartialId = crypto.randomUUID();
      const partialLink = "/pages/foo";
      const href = "/docs/index";
      const doc = createDocument(`<div id="container">
  <a id="${anchorWithFpartialId}" f-partial="${partialLink}" href="/pages/bar">with f-partial</button>
  <a id="${anchorWithoutFpartialId}" href="${href}">without f-partial</button>
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
        const anchor = doc.getElementById(
          anchorWithoutFpartialId,
        );
        assertExists(anchor);
        anchor.click();
        assertSpyCalls(updatePartials, 1);
        const [{ args: [event, request] }] = updatePartials.calls;
        assertStrictEquals(event.type, "click");
        assertStrictEquals(request.method, "GET");
        assertStrictEquals(
          request.url,
          `${origin}${href}?fresh-partial=true`,
        );
      }

      {
        const anchor = doc.getElementById(anchorWithFpartialId);
        assertExists(anchor);
        anchor.click();
        assertSpyCalls(updatePartials, 2);
        const [, { args: [event, request] }] = updatePartials.calls;
        assertStrictEquals(event.type, "click");
        assertStrictEquals(request.method, "GET");
        assertStrictEquals(
          request.url,
          `${origin}${partialLink}?fresh-partial=true`,
        );
      }
    });

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

    await t.step("form partials", async (t) => {
      await t.step("supports `GET`", () => {
        const actionLink = "/posts/search";
        const formWithPartialEnabledId = "form-with-partial-enabled";
        const doc = createDocument(`<div id="container" f-client-nav>
  <form id="${formWithPartialEnabledId}" action="${actionLink}" method="GET">
    <input type="text" value="Deno" name="title" />
    <input type="text" value="Article" name="category" />
    <button
      type="submit"
      form="${formWithPartialEnabledId}"
      >
      Submit
    </button>
  </form>
</div>`);
        const container = doc.getElementById("container");
        assertExists(container);
        const updatePartials = spy<
          unknown,
          [Event, Request],
          Promise<unknown>
        >();
        const origin = "http://localhost:8001";
        enablePartialNavigation(
          container,
          origin,
          updatePartials,
        );
        const form = doc.getElementById(formWithPartialEnabledId);
        assertExists(form);
        assertSpyCalls(updatePartials, 0);
        {
          const submitter = form.querySelector("button[type=submit]");
          assertExists(submitter);
          assert("click" in submitter && typeof submitter.click === "function");
          submitter.click();
          assertSpyCalls(updatePartials, 1);
          const [{ args: [event, request] }] = updatePartials.calls;
          assertStrictEquals(event.type, "submit");
          assertStrictEquals(request.method, "GET");
          const url = new URL(request.url);
          assertStrictEquals(url.origin, origin);
          assertStrictEquals(url.pathname, actionLink);
          assertStrictEquals(url.searchParams.size, 2);
          assertStrictEquals(url.searchParams.get("title"), "Deno");
          assertStrictEquals(url.searchParams.get("category"), "Article");
        }
      });
      await t.step("supports `POST`", async () => {
        const actionLink = "/posts/new";
        const formWithPartialEnabledId = "form-with-partial-enabled";
        const doc = createDocument(`<div id="container" f-client-nav>
  <form id="${formWithPartialEnabledId}">
    <input type="text" value="This is a post" name="title" />
    <button
      type="submit"
      formmethod="POST"
      formaction="${actionLink}"
      form="${formWithPartialEnabledId}"
      >
      Submit
    </button>
  </form>
</div>`);
        const container = doc.getElementById("container");
        assertExists(container);
        const updatePartials = spy<
          unknown,
          [Event, Request],
          Promise<unknown>
        >();
        const origin = "http://localhost:8000";
        enablePartialNavigation(
          container,
          origin,
          updatePartials,
        );
        const form = doc.getElementById(formWithPartialEnabledId);
        assertExists(form);
        assertSpyCalls(updatePartials, 0);
        {
          const submitter = form.querySelector("button[type=submit]");
          assertExists(submitter);
          assert("click" in submitter && typeof submitter.click === "function");
          submitter.click();
          assertSpyCalls(updatePartials, 1);
          const [{ args: [event, request] }] = updatePartials.calls;
          assertStrictEquals(event.type, "submit");
          assertStrictEquals(request.method, "POST");
          const formData = await request.formData();
          const data = Array.from(formData.entries()).reduce(
            (data: Record<string, unknown>, entry) => {
              const [key, value] = entry;
              data[key] = value;
              return data;
            },
            {},
          );
          assertEquals(data, {
            "title": "This is a post",
          });
          assertStrictEquals(request.url, `${origin}${actionLink}`);
        }
      });
    });
  },
});

Deno.test({
  name: "applyResponseToDocument",
  permissions: "none",
  fn: async (t) => {
    await t.step("supports `replace` mode", async () => {
      const doc = createDocument(`
<html>
  <body>
    <header id="header">
      Hello
    </header>
    <main id="main">
      <!--frsh-partial:main:0:-->
      First content
      <!--/frsh-partial:main:0:-->
    </main>
    <footer f-client-nav id="footer">
      <a href="/about">About</a>
    </footer>
  </body>
</html>`);
      const response = new Response(
        `
 <html>
  <body>
    <header id="header">
      Hi
    </header>
    <main id="main">
      <!--frsh-partial:main:0:-->
      <div>
        New content
      </div>
      <!--/frsh-partial:main:0:-->
    </main>
    <footer f-client-nav id="footer">
      <a href="/blog">Blog</a>
    </footer>
  </body>
</html>     
`,
        {
          headers: {
            "content-type": "text/html",
          },
        },
      );
      await applyResponseToDocument(doc, response);
      const main = doc.getElementById("main");
      assertExists(main);
      assertStrictEquals(main.children.length, 1);
      assertStrictEquals(main.children[0].tagName, "DIV");
      assertStrictEquals(
        main.children[0].textContent?.trim(),
        "New content",
        "A partial area should be replaced",
      );

      const header = doc.getElementById("header");
      assertExists(header);
      assertStrictEquals(
        header.textContent?.trim(),
        "Hello",
        "A non-partial area should not be updated",
      );

      const footer = doc.getElementById("footer");
      assertExists(footer);
      assertStrictEquals(
        footer.textContent?.trim(),
        "About",
        "A non-partial area should not be updated",
      );
    });

    await t.step("supports `append` mode", async () => {
      const doc = createDocument(`
<html>
  <body>
    <header id="header">
      Hello
    </header>
    <main id="main">
      <!--frsh-partial:main:1:-->
      <div>First content</div>
      <!--/frsh-partial:main:1:-->
    </main>
    <footer f-client-nav id="footer">
      <a href="/about">About</a>
    </footer>
  </body>
</html>`);
      const response = new Response(
        `
 <html>
  <body>
    <header id="header">
      Hi
    </header>
    <main id="main">
      <!--frsh-partial:main:1:-->
      <section>
        <h2>Title</h2>
        <span>New content</span>
      </section>
      <div>
        Another new content
      </div>
      <!--/frsh-partial:main:1:-->
    </main>
    <footer f-client-nav id="footer">
      <a href="/blog">Blog</a>
    </footer>
  </body>
</html>     
`,
        {
          headers: {
            "content-type": "text/html",
          },
        },
      );
      await applyResponseToDocument(doc, response);
      const main = doc.getElementById("main");
      assertExists(main);
      assertStrictEquals(main.children.length, 3);
      assertStrictEquals(main.children[0].tagName, "DIV");
      assertStrictEquals(main.children[1].tagName, "SECTION");
      assertStrictEquals(main.children[2].tagName, "DIV");
      assertStrictEquals(
        main.children[0].textContent?.trim(),
        "First content",
      );
      assertStrictEquals(
        main.children[1].children.length,
        2,
        "A new content should be appended",
      );
      assertStrictEquals(
        main.children[1].children[0].textContent?.trim(),
        "Title",
      );
      assertStrictEquals(
        main.children[1].children[1].textContent?.trim(),
        "New content",
      );
      assertStrictEquals(
        main.children[2].textContent?.trim(),
        "Another new content",
        "A new content should be appended",
      );

      const header = doc.getElementById("header");
      assertExists(header);
      assertStrictEquals(
        header.textContent?.trim(),
        "Hello",
        "A non-partial area should not be updated",
      );

      const footer = doc.getElementById("footer");
      assertExists(footer);
      assertStrictEquals(
        footer.textContent?.trim(),
        "About",
        "A non-partial area should not be updated",
      );
    });

    await t.step("supports `prepend` mode", async () => {
      const doc = createDocument(`
<html>
  <body>
    <header id="header">
      Hello
    </header>
    <main id="main">
      <!--frsh-partial:main:2:-->
      <div>First content</div>
      <!--/frsh-partial:main:2:-->
    </main>
    <footer f-client-nav id="footer">
      <a href="/about">About</a>
    </footer>
  </body>
</html>`);
      const response = new Response(
        `
 <html>
  <body>
    <header id="header">
      Hi
    </header>
    <main id="main">
      <!--frsh-partial:main:2:-->
      <div>
        New content
      </div>
      <div>
        Another new content
      </div>
      <!--/frsh-partial:main:2:-->
    </main>
    <footer f-client-nav id="footer">
      <a href="/blog">Blog</a>
    </footer>
  </body>
</html>     
`,
        {
          headers: {
            "content-type": "text/html",
          },
        },
      );
      await applyResponseToDocument(doc, response);
      const main = doc.getElementById("main");
      assertExists(main);
      assertStrictEquals(main.children.length, 3);
      assertStrictEquals(main.children[0].tagName, "DIV");
      assertStrictEquals(main.children[1].tagName, "DIV");
      assertStrictEquals(main.children[2].tagName, "DIV");
      assertStrictEquals(
        main.children[0].textContent?.trim(),
        "New content",
        "A new content should be prepended",
      );
      assertStrictEquals(
        main.children[1].textContent?.trim(),
        "Another new content",
        "A new content should be prepended",
      );
      assertStrictEquals(
        main.children[2].textContent?.trim(),
        "First content",
      );

      const header = doc.getElementById("header");
      assertExists(header);
      assertStrictEquals(
        header.textContent?.trim(),
        "Hello",
        "A non-partial area should not be updated",
      );

      const footer = doc.getElementById("footer");
      assertExists(footer);
      assertStrictEquals(
        footer.textContent?.trim(),
        "About",
        "A non-partial area should not be updated",
      );
    });
  },
});

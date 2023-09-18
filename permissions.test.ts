import { assert } from "$std/assert/assert.ts";
import { assertEquals } from "$std/assert/assert_equals.ts";
import { remarkGfm, remarkParse, unified } from "./deps/remark.ts";

const markdownPath =
  new URL(import.meta.resolve("./docs/permissions.md")).pathname;
Deno.test({
  name: "permissions",
  permissions: {
    read: [markdownPath],
    run: ["deno"],
  },
  fn: async (t) => {
    const markdown = await Deno.readTextFile(markdownPath);
    const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown);
    type Content = typeof tree["children"][number];

    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== "heading" || node.depth < 2) {
        continue;
      }

      const [headingContent] = node.children;
      assertEquals(headingContent.type, "inlineCode");
      assert(headingContent.type === "inlineCode");
      assert(
        headingContent.value.startsWith("$fresh-testing-library/"),
        `${headingContent.value} should start with "$fresh-testing-library/"`,
      );
      const moduleName = headingContent.value.slice(
        "$fresh-testing-library/".length,
      );

      for (let j = i + 1; j < tree.children.length; j++) {
        if (tree.children[j].type === "table") {
          i = j;
          break;
        }
        assert(
          j + 1 < tree.children.length,
          `\`${headingContent.value}\` section should have a markdown table`,
        );
      }

      const table = tree.children[i];
      const permissionFlags = extractPermissionFlagsFromMarkdownTable(table);

      await t.step({
        name: headingContent.value,
        fn: async (t) => {
          const testdataPath =
            new URL(import.meta.resolve(`./testdata/permissions/${moduleName}`))
              .pathname;
          await t.step(
            `deno run ${permissionFlags.join(" ")} ${testdataPath}`,
            async () => {
              const status = await new Deno.Command("deno", {
                args: [
                  "run",
                  ...permissionFlags,
                  testdataPath,
                ],
                env: { DENO_NO_PROMPT: "1" },
              }).output();
              const decoder = new TextDecoder();
              const stdout = decoder.decode(status.stdout);
              const stderr = decoder.decode(status.stderr);
              assert(
                status.success,
                ["stdout:", stdout, "", "stderr:", stderr].join("\n"),
              );
            },
          );
        },
      });
    }

    function extractPermissionFlagsFromMarkdownTable(
      table: Content,
    ): Array<string> {
      assertEquals(table.type, "table");
      assert(table.type === "table");
      const [header, ...rows] = table.children;
      assertEquals(
        header.children.map((x) => {
          const node = x.children[0];
          assert(node.type === "text");
          return node.value;
        }),
        ["Permission", "Value", "Description"],
      );
      const permissionFlags = rows.map((row) => {
        const [permissionCell, valueCell] = row.children;
        const [permission] = permissionCell.children;
        const [value] = valueCell.children;
        assertEquals(permission.type, "inlineCode");
        assert(permission.type === "inlineCode");
        assertEquals(value.type, "inlineCode");
        assert(value.type === "inlineCode");
        if (value.value === "*") {
          return permission.value;
        } else {
          return `${permission.value}=${value.value}`;
        }
      });
      return permissionFlags;
    }
  },
});

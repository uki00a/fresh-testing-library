import { Head, Partial } from "$fresh/runtime.ts";
import type { Handlers, PageProps, RouteConfig } from "$fresh/server.ts";
import { CSS as GFMCSS, render as renderGFM } from "$gfm";
import { join } from "node:path";

interface Data {
  content: string;
}

export const config: RouteConfig = {
  skipAppWrapper: true,
};

export const handler: Handlers<Data> = {
  async GET(_, ctx) {
    const url = ctx.params.path === ""
      ? import.meta.resolve("../../../README.md")
      : import.meta.resolve(join("../../../docs", `${ctx.params.path}.md`));
    const md = await Deno.readTextFile(new URL(url));
    const data: Data = {
      content: renderGFM(md, {}),
    };
    return ctx.render(data);
  },
};

export default function DocPage(props: PageProps<Data>) {
  return (
    <>
      <Head>
        <style id="gfm">{GFMCSS}</style>
      </Head>
      <Partial name="docs-content">
        <article
          data-color-mode="auto"
          data-dark-theme="dark"
          class="p-4 mx-auto w-full markdown-body"
          // deno-lint-ignore react-no-dangera
          dangerouslySetInnerHTML={{ __html: props.data.content }}
        />
      </Partial>
    </>
  );
}

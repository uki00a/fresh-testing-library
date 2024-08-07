import type { LayoutProps } from "$fresh/server.ts";

export default function Layout(props: LayoutProps) {
  return (
    <body class="flex">
      <aside class="min-w-[14rem] p-4">
        <Sidebar
          docs={[
            { title: "TOP", link: "/docs" },
            { title: "Permissions", link: "/docs/permissions" },
          ]}
        />
      </aside>
      <main>
        <props.Component />
      </main>
    </body>
  );
}

interface SidebarProps {
  docs: Array<{ title: string; link: string }>;
}

function Sidebar(props: SidebarProps) {
  return (
    <nav f-client-nav>
      <ul class="flex flex-col gap-2">
        {props.docs.map((x) => (
          <li>
            <a
              class="[data-current]:font-bold"
              href={x.link}
            >
              {x.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

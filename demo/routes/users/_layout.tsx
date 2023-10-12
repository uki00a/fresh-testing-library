import type { LayoutProps } from "$fresh/server.ts";
import { Partial } from "$fresh/runtime.ts";

export default function Layout(props: LayoutProps) {
  return (
    <Partial name="users-main">
      <props.Component />
    </Partial>
  );
}

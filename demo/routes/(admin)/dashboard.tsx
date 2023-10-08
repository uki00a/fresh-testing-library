import { Head } from "$fresh/runtime.ts";
import type { Handlers, PageProps } from "$fresh/server.ts";

interface Data {
  totalUsers: number;
  activeUsers: number;
}

export const handler: Handlers<Data, Data> = {
  GET(_, ctx) {
    return ctx.render({
      totalUsers: ctx.state.totalUsers ?? 1,
      activeUsers: ctx.state.activeUsers ?? 0,
    });
  },
};

export default function AdminDashboard(props: PageProps<Data>) {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <title>Dashbaord</title>
      </Head>
      <main>
        <dl>
          <dt>Total users</dt>
          <dd>{props.data.totalUsers}</dd>
          <dt>Active users</dt>
          <dd>{props.data.activeUsers}</dd>
        </dl>
      </main>
    </>
  );
}

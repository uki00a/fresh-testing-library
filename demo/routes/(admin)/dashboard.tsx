import { Head } from "$fresh/runtime.ts";
import type { Handlers, PageProps } from "$fresh/server.ts";

interface Data {
  totalUsers: number;
  activeUsers: number;
}

export const handler: Handlers<Data> = {
  GET(_, ctx) {
    return ctx.render({
      totalUsers: 123,
      activeUsers: 45,
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

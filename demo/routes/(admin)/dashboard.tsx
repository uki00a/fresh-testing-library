import { Head } from "$fresh/runtime.ts";
import type { PageProps } from "$fresh/server.ts";

export default function AdminDashboard(props: PageProps) {
  return (
    <>
      <Head>
        <meta charSet="UTF-8" />
        <title>Dashbaord</title>
      </Head>
      <main>
        <dl>
          <dt>Total users</dt>
          <dd>123</dd>
          <dt>Active users</dt>
          <dd>45</dd>
        </dl>
      </main>
    </>
  );
}

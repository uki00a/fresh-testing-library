import { defineRoute } from "$fresh/server.ts";
import type { State } from "./_middleware.ts";

export default defineRoute<State>(async (_, ctx) => {
  console.info(ctx);
  const id = Number.parseInt(ctx.params.id);
  const user = await ctx.state.users.getByID(id);
  return (
    <>
      <dl role="group" class="shadow-md p-4">
        <dt class="font-bold">ID:</dt>
        <dd>{id}</dd>
        <dt class="font-bold">Name:</dt>
        <dd>{user.name}</dd>
        <dt class="font-bold">Email:</dt>
        <dd>{user.email}</dd>
      </dl>
      <div f-client-nav>
        <a href="/users">
          <i>⬅</i>️Back to Top
        </a>
      </div>
    </>
  );
});

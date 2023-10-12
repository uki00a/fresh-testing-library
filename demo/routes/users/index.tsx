import type { State } from "./_middleware.ts";
import type { Handlers, PageProps } from "$fresh/server.ts";
import type { User } from "⚫/user.ts";

interface Data {
  users: Array<User>;
}

export const handler: Handlers<unknown, State> = {
  async GET(_, ctx) {
    const users = await ctx.state.users.all();
    const data: Data = { users };
    return ctx.render(data);
  },
};

export default function UsersPage(props: PageProps<Data>) {
  return (
    <ul class="flex flex-col gap-2">
      {Object.entries(props.data.users).map(([id, user]) => {
        return (
          <li key={id} class="shadow-md p-4" f-client-nav>
            <a href={`/users/${id}`} class="font-bold">
              {user.name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

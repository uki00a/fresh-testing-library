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
    <ul class="flex flex-col gap-2" f-client-nav>
      {props.data.users.map((user) => {
        return (
          <li key={user.id} class="shadow-md p-4">
            <a href={`/users/${user.id}`} class="font-bold">
              {user.name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

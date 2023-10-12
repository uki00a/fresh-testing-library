import type { MiddlewareHandler } from "$fresh/server.ts";
import type { Users } from "⚫/user.ts";
import { createInMemoryUsers } from "🔧/users.ts";

export interface State {
  users: Users;
}

export const handler: MiddlewareHandler<State> = async (_, ctx) => {
  ctx.state.users = createInMemoryUsers();
  return await ctx.next();
};

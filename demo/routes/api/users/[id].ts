import { Handlers } from "$fresh/server.ts";

const users: Record<string, string> = {
  1: "bob",
  2: "alice",
};

export const handler: Handlers = {
  GET: (_req, ctx) => {
    const user = users[ctx.params.id];
    if (user == null) {
      return ctx.renderNotFound();
    }
    return new Response(user);
  },
};

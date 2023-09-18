import { defineRoute } from "$fresh/server.ts";

const users: Record<string, string> = {
  1: "foo",
  2: "bar",
};

export default defineRoute((_, ctx) => {
  const maybeUser = users[ctx.params.id];
  if (maybeUser == null) {
    return ctx.renderNotFound();
  }

  return (
    <div>
      Hello {maybeUser}!
    </div>
  );
});

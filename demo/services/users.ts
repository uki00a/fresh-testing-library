import type { User, Users } from "⚫/user.ts";

export function createInMemoryUsers(): Users {
  const users: Record<string, User> = {
    1: { id: 1, name: "foo", email: "foo@example.com" },
    2: { id: 2, name: "bar", email: "bar@example.com" },
    3: { id: 3, name: "baz", email: "baz@example.com" },
  };

  function all() {
    return Promise.resolve(Object.values(users));
  }

  function getByID(id: number) {
    const maybeUser = users[id];
    if (maybeUser == null) {
      throw new Error("Not found");
    }
    return Promise.resolve(maybeUser);
  }

  return { all, getByID };
}

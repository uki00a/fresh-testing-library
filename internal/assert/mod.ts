export function assert(expr: unknown, message?: string): asserts expr {
  if (!expr) throw new AssertionError(message);
}

class AssertionError extends Error {
  constructor(message?: string) {
    super(`[fresh-testing-library] ${message || "AssertionError"}`);
  }
}

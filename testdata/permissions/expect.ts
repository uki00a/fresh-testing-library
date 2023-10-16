import { expect, fn } from "$fresh-testing-library/expect.ts";

expect(1).toEqual(1);
expect(fn()).not.toBeCalled();

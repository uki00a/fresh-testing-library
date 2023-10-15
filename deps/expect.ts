/**
 * {@link https://github.com/jestjs/jest/tree/v29.7.0/packages/expect}
 */
import { expect } from "npm:expect@29.7.0";
export { expect, JestAssertionError } from "npm:expect@29.7.0";

/**
 * {@link https://github.com/jestjs/jest/tree/v29.7.0/packages/jest-mock}
 */
export {
  fn,
  mocked,
  replaceProperty,
  spyOn,
} from "https://esm.sh/jest-mock@29.7.0?pin=v133";

/**
 * {@link https://github.com/testing-library/jest-dom}
 */
import * as jestDOMMatchers from "https://esm.sh/@testing-library/jest-dom@6.1.4/matchers?pin=v133";
import type { TestingLibraryMatchers } from "https://esm.sh/@testing-library/jest-dom@6.1.4/types/matchers.d.ts?pin=v133";

expect.extend(jestDOMMatchers);

/**
 * This definition is based on https://github.com/testing-library/jest-dom/blob/v6.1.4/types/jest-globals.d.ts which is licensed as follows:
 * ---
 * The MIT License (MIT)
 * Copyright (c) 2017 Kent C. Dodds
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * ---
 * {@link https://github.com/jestjs/jest/blob/v29.7.0/docs/ExpectAPI.md}
 */
declare module "npm:expect@29.7.0" {
  // deno-lint-ignore no-empty-interface
  interface Matchers<R>
    extends
      TestingLibraryMatchers<R, ReturnType<typeof expect.stringContaining>> {}
}

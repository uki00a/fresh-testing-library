/**
 * A thin wrapper to
 * [@testing-library/preact]{@link https://github.com/testing-library/preact-testing-library} and [@testing-library/user-event]{@link https://github.com/testing-library/user-event}
 * for testing island components.
 *
 * @module
 */
import { options } from "preact";
import { JSDOM } from "./deps/jsdom.ts";
import { setUpClipboard } from "./deps/jest-clipboard.ts";

export * from "./deps/testing-library.ts";
import { cleanup as _cleanup } from "./deps/testing-library.ts";
import type { Options } from "./deps/testing-library.ts";
import { userEvent } from "./deps/testing-library.ts";

import { createVnodeHook } from "./internal/fresh/preact.ts";
import type { Manifest } from "$fresh/server.ts";

let cleanupVnodeHook: (() => void) | undefined = undefined;

export function cleanup(): void {
  _cleanup();
  cleanupVnodeHook?.();
}

interface SetupOptions {
  manifest?: Manifest;
}

/**
 * This function sets up the DOM environment to make Testing Library work.
 *
 * This function must be called at least once before using various APIs of Testing Library.
 */
export function setup(options?: SetupOptions) {
  if (globalThis.document) return;
  setupDocument();
  setUpClipboard();
  setupUserEvent();
  setupPreactOptionsHooks(options?.manifest);
}

function setupDocument(): void {
  const jsdom = new JSDOM();
  const { document } = jsdom.window;
  globalThis.document = document;
}

function setupUserEvent(): void {
  /**
   * NOTE: Workaround for the problem of `globalThis.document` not being set at the time of loading `@testing-library/user-event`.
   * TODO: Need a better solution to this problem.
   * {@link https://github.com/testing-library/user-event/blob/v14.5.1/src/setup/setup.ts#L25}
   * {@link https://github.com/testing-library/user-event/blob/v14.5.1/src/setup/index.ts}
   */
  const setupUserEvent = userEvent.setup;
  Object.assign(userEvent, {
    setup(options: Options) {
      return setupUserEvent({
        document,
        ...options,
      });
    },
  });
}

function setupPreactOptionsHooks(manifest?: Manifest): void {
  const { cleanup, vnode } = createVnodeHook(options.vnode, manifest);
  options.vnode = vnode;
  cleanupVnodeHook = cleanup;
}

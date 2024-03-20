/**
 * A thin wrapper to
 * [@testing-library/preact]{@link https://github.com/testing-library/preact-testing-library} and [@testing-library/user-event]{@link https://github.com/testing-library/user-event}
 * for testing island components.
 *
 * @module
 */
import type { ComponentChild } from "preact";
import { options } from "preact";
import { AsyncLocalStorage } from "node:async_hooks";
import { setUpClipboard } from "./deps/jest-clipboard.ts";

export * from "./deps/testing-library.ts";
import {
  cleanup as _cleanup,
  render as _render,
} from "./deps/testing-library.ts";
import type {
  Options,
  Queries,
  RenderOptions,
  RenderResult,
} from "./deps/testing-library.ts";
import { userEvent } from "./deps/testing-library.ts";

import { createVnodeHook } from "./internal/fresh/preact.ts";
import { createDocument } from "./internal/jsdom/mod.ts";
import type { Manifest } from "$fresh/server.ts";

let cleanupVnodeHook: (() => void) | undefined = undefined;
interface ManifestHolder {
  manifest?: Manifest;
}
const manifestHolder: ManifestHolder = {};

const asyncLocalStorage = new AsyncLocalStorage<{ isCSR: true }>();
export function render(
  ui: ComponentChild,
  options?: Omit<RenderOptions, "queries">,
): RenderResult;
export function render<Q extends Queries>(
  ui: ComponentChild,
  options: RenderOptions<Q>,
): RenderResult<Q>;
export function render<Q extends Queries>(
  ui: ComponentChild,
  options?: RenderOptions<Q> | Omit<RenderOptions, "queries">,
): RenderResult<Q> | RenderResult {
  return asyncLocalStorage.run({ isCSR: true }, () => _render(ui, options));
}

export function cleanup(): void {
  _cleanup();
  cleanupVnodeHook?.();
}

function isCSR(): boolean {
  return asyncLocalStorage.getStore()?.isCSR === true;
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
  if (options?.manifest) {
    manifestHolder.manifest = options.manifest;
  }

  setupDOMEnvironmentOnce();
  setupPreactOptionsHooksOnce(location);
}

function setupDOMEnvironmentOnce(): void {
  if (globalThis.document) return;
  setupDocument();
  setUpClipboard();
  setupUserEvent();
}

function setupDocument(): void {
  globalThis.document = createDocument();
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

function setupPreactOptionsHooksOnce(
  location?: Location,
): void {
  if (cleanupVnodeHook) return;

  const { cleanup, vnode } = createVnodeHook(
    options.vnode,
    () => manifestHolder.manifest,
    isCSR,
    document,
    location,
  );
  options.vnode = vnode;
  cleanupVnodeHook = cleanup;
}

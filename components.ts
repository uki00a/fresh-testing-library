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

import { createPartialsUpdater } from "./internal/fresh/partials.ts";
import { createVnodeHook } from "./internal/fresh/preact.ts";
import {
  clearDefaultManifest,
  maybeGetDefaultManifest,
  setDefaultManifest,
} from "./internal/fresh/manifest.ts";
import { createDocument } from "./internal/jsdom/mod.ts";
// deno-lint-ignore no-unused-vars -- referenced by `@linkcode`
import type { CreateFreshContextOptions } from "./internal/fresh/context.ts";
import type { Manifest } from "$fresh/server.ts";

let cleanupVnodeHook: (() => void) | undefined = undefined;
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

/**
 * Options which can be passed to {@linkcode setup}.
 */
export interface SetupOptions {
  /**
   * @description Optionally, the {@linkcode Manifest} object which is exported from `fresh.gen.ts` can be set to this option.
   *
   * If this option is specified, emulation of partial rendering is enabled.
   *
   * The {@linkcode Manifest} object specified by this option is also used as the default value for {@linkcode CreateFreshContextOptions.manifest}, etc.
   */
  manifest?: Manifest;
}

/**
 * This function sets up the DOM environment to make Testing Library work.
 *
 * This function must be called at least once before using various APIs of Testing Library.
 */
export function setup(options?: SetupOptions) {
  if (options?.manifest) {
    setDefaultManifest(options.manifest);
  } else if (options && "manifest" in options) {
    clearDefaultManifest();
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
  if (globalThis.window == null) {
    // NOTE: `window` will be removed in Deno v2
    // See: https://github.com/testing-library/dom-testing-library/blob/v8.20.0/src/helpers.ts#L20-L26
    // TODO: Find a better solution
    // @ts-expect-error This is intended
    globalThis.window = globalThis;
  }
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
    createPartialsUpdater(
      maybeGetDefaultManifest,
      document,
    ),
    isCSR,
    location,
  );
  options.vnode = vnode;
  cleanupVnodeHook = cleanup;
}

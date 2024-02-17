/**
 * Utilities for testing handlers, middlewares, routes, etc.
 *
 * @module
 */
export type {
  CreateFreshContextOptions,
  CreateRouteContextOptions,
} from "./internal/fresh/context.ts";
export {
  createFreshContext,
  createRouteContext,
} from "./internal/fresh/context.ts";

import type { CreateFreshContextOptions } from "./internal/fresh/context.ts";
import { createFreshContext } from "./internal/fresh/context.ts";

/**
 * @deprecated Use {@linkcode CreateFreshContextOptions} instead.
 *
 * Options which can be passed to {@linkcode createHandlerContext}.
 */
export type CreateHandlerContextOptions<
  TState extends Record<string, unknown> = Record<string, unknown>,
> = CreateFreshContextOptions<unknown, TState>;

/**
 * @deprecated Use {@linkcode CreateFreshContextOptions} instead.
 *
 * Options which can be passed to {@linkcode createMiddlewareHandlerContext}.
 */
export type CreateMiddlewareHandlerContextOptions<
  TState extends Record<string, unknown> = Record<string, unknown>,
> = CreateFreshContextOptions<unknown, TState>;

/**
 * @deprecated Use {@linkcode createFreshContext} instead.
 */
export const createHandlerContext = createFreshContext;

/**
 * @deprecated Use {@linkcode createFreshContext} instead.
 */
export const createMiddlewareHandlerContext = createFreshContext;

/**
 * Utilities for testing handlers, middlewares, routes, etc.
 *
 * @module
 */

import type {
  HandlerContext,
  Manifest,
  MiddlewareHandlerContext,
  RouteContext,
} from "$fresh/server.ts";
import {
  determineRoute,
  determineRouteDestinationKind,
  extractParams,
  findMatchingRouteAndPathPatternFromManifest,
  isRouteModule,
  isSyncRouteComponent,
  renderAsyncRouteComponent,
  renderSyncRouteComponent,
} from "./internal/fresh/mod.ts";

/**
 * Options which can be passed to {@linkcode createHandlerContext}.
 */
export interface CreateHandlerContextOptions<
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends ContextFactoryOptions<TState> {
  /**
   * @description This option allows overriding a response which is returned by {@linkcode HandlerContext.render}.
   */
  response: Response | HandlerContext["render"];

  /**
   * @description This option allows overriding a response which is returned by {@linkcode HandlerContext.renderNotFound}.
   */
  responseNotFound: Response | HandlerContext["renderNotFound"];
}

/**
 * Options which can be passed to {@linkcode createRouteContext}.
 */
export interface CreateRouteContextOptions<
  // deno-lint-ignore no-explicit-any
  TData = any,
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends ContextFactoryOptions<TState> {
  /**
   * @description This option allows overriding a response which is returned by {@linkcode RouteContext.renderNotFound}.
   */
  responseNotFound: Response | RouteContext["renderNotFound"];

  /**
   * @description This option allows overriding {@linkcode RouteContext.data}.
   */
  data: TData;
}

/**
 * Options which can be passed to {@linkcode createMiddlewareHandlerContext}.
 */
export interface CreateMiddlewareHandlerContextOptions<
  TState extends Record<string, unknown> = Record<string, unknown>,
> extends ContextFactoryOptions<TState> {
  /**
   * @description This option allows overriding a response which is returned by {@linkcode MiddlewareHandlerContext.next}.
   */
  response: Response;

  /**
   * @description This option allows overriding {@linkcode MiddlewareHandlerContext.destination} which is automatically inferred from {@linkcode Manifest} and {@linkcode Request.url} by default.
   */
  destination: MiddlewareHandlerContext["destination"];
}

interface ContextFactoryOptions<TState extends Record<string, unknown>> {
  /**
   * @description This option allows overriding `ctx.params` property.
   */
  params: Record<string, string>;

  /**
   * @description This option allows injecting dependencies into `ctx.state`.
   */
  state: TState;

  /**
   * @description Optionally, the {@linkcode Manifest} object which is exported from `fresh.gen.ts` can be set to this option. If this option is specified, some properties, such as `ctx.params`, is automatically inferred from {@linkcode Request.url}.
   */
  manifest: Manifest;

  /**
   * @description This options allows overriding `ctx.localAddr`. If not specified, `ctx.localAddr` is automatically inferred from {@linkcode Request.url}.
   */
  localAddr: Deno.NetAddr;

  /**
   * @description This options allows overriding `ctx.remoteAddr`.
   */
  remoteAddr: Deno.NetAddr;
}

export function createHandlerContext(
  request: Request,
): HandlerContext<unknown, Record<string, unknown>>;

export function createHandlerContext<
  TData = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  options?: Partial<CreateHandlerContextOptions<TState>>,
): HandlerContext<TData, TState>;

/**
 * This function creates {@linkcode HandlerContext} which can be passed directly to fresh handlers.
 * If {@linkcode CreateHandlerContextOptions.manifest} is specified, {@linkcode HandlerContext.params} and a route to be rendered by {@linkcode HandlerContext.render} is automatically inferred from {@linkcode Request.url}.
 *
 * @example
 * ```ts
 * import { createHandlerContext } from "$fresh-testing-library/server.ts";
 * import { handler } from "$/routes/api/users/[id].ts";
 * import manifest from "$/fresh.gen.ts";
 * import { assertExists } from "$std/assert/assert_exists.ts";
 * import { assertEquals } from "$std/assert/assert_equals.ts";
 *
 * const request = new Request("http://localhost:8000/api/users/34");
 * const ctx = createHandlerContext(request, { manifest });
 * assertEquals(ctx.params, { id: "34" });
 *
 * assertExists(handler.GET);
 * const response = await handler.GET(request, ctx);
 * ```
 */
export function createHandlerContext<
  TData = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  request: Request,
  options?: Partial<CreateHandlerContextOptions<TState>>,
): HandlerContext<TData, TState>;

export function createHandlerContext<
  TData = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  requestOrOptions?: Request | Partial<CreateHandlerContextOptions<TState>>,
  options?: Partial<CreateHandlerContextOptions<TState>>,
): HandlerContext<TData, TState> {
  if (!(requestOrOptions instanceof Request)) {
    const { localAddr, ...restOptions } = requestOrOptions ?? {};
    return createHandlerContext(
      createDefaultRequest(localAddr),
      restOptions,
    );
  }

  const request: Request = requestOrOptions;
  const url = new URL(request.url);
  const {
    manifest,
    params: _params,
    state = {} as TState,
    response,
    responseNotFound = createNotFoundResponse(),
    localAddr = createDefaultLocalAddr(url),
    remoteAddr = createDefaultRemoteAddr(url),
  } = options ?? {};
  const params = _params ?? (manifest ? extractParams(request, manifest) : {});

  function createRender() {
    if (response instanceof Response) {
      return () => response;
    }

    if (manifest) {
      return async (data: TData | undefined) => {
        const maybeRouteAndPathPattern =
          await findMatchingRouteAndPathPatternFromManifest(request, manifest);
        if (
          maybeRouteAndPathPattern && isRouteModule(maybeRouteAndPathPattern[0])
        ) {
          const [route, pattern] = maybeRouteAndPathPattern;
          const routeComponent = route.default;
          if (routeComponent == null) {
            return createDefaultResponse();
          }

          if (isSyncRouteComponent(routeComponent)) {
            return renderSyncRouteComponent(
              routeComponent,
              request,
              pattern,
              params,
              data,
              state,
            );
          } else {
            return renderAsyncRouteComponent(
              routeComponent,
              request,
              createRouteContext(request, { data, manifest, state }),
            );
          }
        }

        return createDefaultResponse();
      };
    }

    return () => createDefaultResponse();
  }

  return {
    params: params ?? (manifest ? extractParams(request, manifest) : {}),
    state,
    localAddr,
    remoteAddr,
    render: createRender(),
    renderNotFound: responseNotFound instanceof Response
      ? () => responseNotFound
      : responseNotFound,
  };
}

export function createRouteContext(
  request: Request,
): RouteContext<unknown, Record<string, unknown>>;

export function createRouteContext<
  TData = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  options?: Partial<CreateRouteContextOptions<TData, TState>>,
): RouteContext<TData, TState>;

/**
 * This function creates {@linkcode RouteContext} which can be passed directly to fresh routes.
 * If {@linkcode CreateRouteContextOptions.manifest} is specified, {@linkcode RouteContext.params} is automatically inferred from {@linkcode Request.url}.
 */
export function createRouteContext<
  TData = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  request: Request,
  options?: Partial<CreateRouteContextOptions<TData, TState>>,
): RouteContext<TData, TState>;

export function createRouteContext<
  TData = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  requestOrOptions?:
    | Request
    | Partial<CreateRouteContextOptions<TData, TState>>,
  options?: Partial<CreateRouteContextOptions<TData, TState>>,
): RouteContext<TData, TState> {
  if (!(requestOrOptions instanceof Request)) {
    const { localAddr, ...restOptions } = requestOrOptions ?? {};
    return createRouteContext(
      createDefaultRequest(localAddr),
      restOptions,
    );
  }

  const request: Request = requestOrOptions;
  const url = new URL(request.url);
  const {
    params,
    state = {} as TState,
    responseNotFound = createNotFoundResponse(),
    localAddr = createDefaultLocalAddr(url),
    remoteAddr = createDefaultRemoteAddr(url),
    manifest,
    data = undefined as TData,
  } = options ?? {};
  return {
    params: params ?? (manifest ? extractParams(request, manifest) : {}),
    state,
    localAddr,
    remoteAddr,
    renderNotFound: responseNotFound instanceof Response
      ? () => responseNotFound
      : responseNotFound,
    url,
    data,
    route: determineRoute(request, manifest),
  };
}

export function createMiddlewareHandlerContext(
  request: Request,
): MiddlewareHandlerContext;

export function createMiddlewareHandlerContext<
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  options?: Partial<CreateMiddlewareHandlerContextOptions<TState>>,
): MiddlewareHandlerContext<TState>;

/**
 * This function creates {@linkcode MiddlewareHandlerContext} which can be passed directly to fresh middlewares.
 * If {@linkcode CreateMiddlewareHandlerContextOptions.manifest} is specified, {@linkcode MiddlewareHandlerContext.params} is automatically inferred from {@linkcode Request.url}.
 *
 * @example
 * ```ts
 * import { createMiddlewareHandlerContext } from "$fresh-testing-library/server.ts";
 * import { createLoggerMiddleware } from "$/routes/(_middlewares)/logger.ts";
 * import manifest from "$/fresh.gen.ts";
 * import { assertEquals } from "$std/assert/assert_equals.ts";
 *
 * const middleware = createLoggerMiddleware(console);
 * const request = new Request("http://localhost:8000/api/users/123");
 * const ctx = createMiddlewareHandlerContext(request, { manifest });
 * assertEquals(ctx.params, { id: "123" });
 *
 * await middleware(request, ctx);
 * ```
 */
export function createMiddlewareHandlerContext<
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  request: Request,
  options?: Partial<CreateMiddlewareHandlerContextOptions<TState>>,
): MiddlewareHandlerContext<TState>;

export function createMiddlewareHandlerContext<
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  requestOrOptions?:
    | Request
    | Partial<CreateMiddlewareHandlerContextOptions<TState>>,
  options?: Partial<CreateMiddlewareHandlerContextOptions<TState>>,
): MiddlewareHandlerContext<TState> {
  if (!(requestOrOptions instanceof Request)) {
    const { localAddr, ...restOptions } = requestOrOptions ?? {};
    return createMiddlewareHandlerContext(
      createDefaultRequest(localAddr),
      restOptions,
    );
  }

  const request: Request = requestOrOptions;
  const url = new URL(request.url);
  const {
    params,
    state = {} as TState,
    response = createDefaultResponse(),
    localAddr = createDefaultLocalAddr(url),
    remoteAddr = createDefaultRemoteAddr(url),
    destination = determineRouteDestinationKind(
      url.pathname,
      options?.manifest,
    ),
    manifest,
  } = options ?? {};

  return {
    params: params ?? (manifest ? extractParams(request, manifest) : {}),
    state,
    localAddr,
    remoteAddr,
    destination,
    next: () => Promise.resolve(response),
  };
}

function createDefaultRequest(localAddr?: Deno.NetAddr): Request {
  return new Request(
    `http://${localAddr?.hostname ?? "localhost"}:${localAddr?.port ?? 8020}`,
  );
}

function createDefaultResponse(): Response {
  return new Response("OK");
}

function createNotFoundResponse(): Response {
  return new Response("Not Found", { status: 404 });
}

function createDefaultLocalAddr(url: URL) {
  return {
    transport: "tcp" as const,
    hostname: url.hostname,
    port: Number.parseInt(url.port),
  };
}

function createDefaultRemoteAddr(url: URL) {
  return {
    transport: "tcp" as const,
    hostname: url.hostname,
    port: 49152,
  };
}

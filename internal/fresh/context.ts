import type {
  FreshConfig,
  FreshContext,
  Manifest,
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
} from "./mod.ts";
import { resolveConfig } from "./config.ts";

/**
 * Options which can be passed to {@linkcode createFreshContext}.
 */
export interface CreateFreshContextOptions<
  // deno-lint-ignore no-explicit-any
  TData = any,
  TState = Record<string, unknown>,
> {
  /**
   * @description This option allows overriding {@linkcode FreshContext.params} property.
   */
  params: Record<string, string>;

  /**
   * @description This option allows injecting dependencies into {@linkcode FreshContext.state}.
   */
  state: TState;

  /**
   * @description Optionally, the {@linkcode Manifest} object which is exported from `fresh.gen.ts` can be set to this option. If this option is specified, some properties, such as {@linkcode FreshContext.params}, are automatically inferred from {@linkcode Request.url}.
   */
  manifest: Manifest;

  /**
   * @description Optionally, {@linkcode FreshConfig} object which is exported from `fresh.config.ts` can be set to this option. With this option, you can test the behavior that depends on {@linkcode FreshContext.config}.
   */
  config: FreshConfig;

  /**
   * @description This options allows overriding {@linkcode FreshContext.localAddr}. If not specified, {@linkcode FreshContext.localAddr} is automatically inferred from {@linkcode Request.url}.
   */
  localAddr: Deno.NetAddr;

  /**
   * @description This options allows overriding {@linkcode FreshContext.remoteAddr}.
   */
  remoteAddr: Deno.NetAddr;

  /**
   * @description This option allows overriding {@linkcode FreshContext.data}.
   */
  data: TData;

  /**
   * @description This option allows overriding a response which is returned by {@linkcode FreshContext.render}.
   */
  response: Response | FreshContext["render"];

  /**
   * @description This option allows overriding a response which is returned by {@linkcode FreshContext.renderNotFound}.
   */
  responseNotFound: Response | FreshContext["renderNotFound"];

  /**
   * @description This option allows overriding {@linkcode FreshContext.destination} which is automatically inferred from {@linkcode Manifest} and {@linkcode Request.url} by default.
   */
  destination: FreshContext["destination"];
}

/**
 * Options which can be passed to {@linkcode createRouteContext}.
 */
export type CreateRouteContextOptions<
  // deno-lint-ignore no-explicit-any
  TData = any,
  TState extends Record<string, unknown> = Record<string, unknown>,
> = CreateFreshContextOptions<TData, TState>;

export function createFreshContext(
  request: Request,
): FreshContext<Record<string, unknown>, unknown>;

export function createFreshContext<
  TData = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  options?: Partial<CreateFreshContextOptions<TData, TState>>,
): FreshContext<TState, TData>;

/**
 * This function creates {@linkcode FreshContext} which can be passed directly to fresh handlers, middlewares, routes, etc.
 * If {@linkcode CreateFreshContextOptions.manifest} is specified, {@linkcode FreshContext.params} and a route to be rendered by {@linkcode FreshContext.render} is automatically inferred from {@linkcode Request.url}.
 *
 * ```ts
 * import { createFreshContext } from "$fresh-testing-library/server.ts";
 * import { handler } from "$/routes/api/users/[id].ts";
 * import manifest from "$/fresh.gen.ts";
 * import { assertExists } from "$std/assert/assert_exists.ts";
 * import { assertEquals } from "$std/assert/assert_equals.ts";
 *
 * const request = new Request("http://localhost:8000/api/users/34");
 * const ctx = createFreshContext(request, { manifest });
 * assertEquals(ctx.params, { id: "34" });
 *
 * assertExists(handler.GET);
 * const response = await handler.GET(request, ctx);
 * ```
 */
export function createFreshContext<
  TData = unknown,
  TState = Record<string, unknown>,
>(
  request: Request,
  options?: Partial<CreateFreshContextOptions<TData, TState>>,
): FreshContext<TState, TData>;

export function createFreshContext<
  TData = unknown,
  TState extends Record<string, unknown> = Record<string, unknown>,
>(
  requestOrOptions?:
    | Request
    | Partial<CreateFreshContextOptions<TData, TState>>,
  options?: Partial<CreateFreshContextOptions<TData, TState>>,
): FreshContext<TState, TData> {
  if (!(requestOrOptions instanceof Request)) {
    const { localAddr, ...restOptions } = requestOrOptions ?? {};
    return createFreshContext(
      createDefaultRequest(localAddr),
      restOptions as Partial<CreateFreshContextOptions<TData, TState>>,
    );
  }

  const request: Request = requestOrOptions;
  const url = new URL(request.url);
  const {
    manifest,
    params: _params,
    state = {} as TState,
    data = {} as TData,
    response,
    responseNotFound = createNotFoundResponse(),
    localAddr = createDefaultLocalAddr(url),
    remoteAddr = createDefaultRemoteAddr(url),
    destination = determineRouteDestinationKind(
      url.pathname,
      options?.manifest,
    ),
  } = options ?? {};
  const params = _params ?? (manifest ? extractParams(request, manifest) : {});

  function createRender() {
    if (response instanceof Response) {
      return () => response.clone();
    }

    if (manifest) {
      return async (data: TData | undefined) => {
        const maybeRouteAndPathPattern =
          await findMatchingRouteAndPathPatternFromManifest(request, manifest);
        if (
          maybeRouteAndPathPattern && isRouteModule(maybeRouteAndPathPattern[0])
        ) {
          const [route] = maybeRouteAndPathPattern;
          const routeComponent = route.default;
          if (routeComponent == null) {
            return createDefaultResponse();
          }
          const renderCtx = data === undefined ? ctx : { ...ctx, data };

          if (isSyncRouteComponent(routeComponent)) {
            return renderSyncRouteComponent(
              renderCtx,
              routeComponent,
            );
          } else {
            return renderAsyncRouteComponent(
              routeComponent,
              request,
              renderCtx,
            );
          }
        }

        return createDefaultResponse();
      };
    }

    return () => createDefaultResponse();
  }

  const config = resolveConfig(options?.config ?? {}, manifest);
  const { basePath } = config;
  const render = createRender();
  const ctx: FreshContext<TState, TData> = {
    /**
     * TODO: support `isPartial`.
     */
    isPartial: false,
    config,
    basePath,
    url,
    /**
     * NOTE: `pattern` has been deprecated.
     *
     * {@link https://deno.land/x/fresh@1.6.0/server.ts?doc=&s=FreshContext#prop_pattern}
     */
    pattern: "",
    params: params ?? (manifest ? extractParams(request, manifest) : {}),
    state,
    data,
    localAddr,
    remoteAddr,
    Component() {
      throw new Error("`FreshContext.Component` is not implemented yet.");
    },
    render,
    renderNotFound: responseNotFound instanceof Response
      ? () => responseNotFound
      : responseNotFound,
    next: response instanceof Response
      ? () => Promise.resolve(response.clone())
      : () =>
        response == null
          ? Promise.resolve(createDefaultResponse())
          : Promise.resolve(response(data)).then((response) =>
            response.clone()
          ),
    route: determineRoute(request, manifest),
    destination,
  };
  return ctx;
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
      restOptions as Partial<CreateRouteContextOptions<TData, TState>>,
    );
  }
  const { render: _render, next: _next, ...ctx } = createFreshContext(
    requestOrOptions,
    options,
  );
  return ctx;
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

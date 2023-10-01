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
  findMatchingRouteFromManifest,
  isRouteModule,
  renderRouteComponent,
} from "./internal/fresh/mod.ts";

interface CreateHandlerContextOptions<
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  params: Record<string, string>;
  state: TState;
  localAddr: Deno.NetAddr;
  remoteAddr: Deno.NetAddr;
  response: Response | HandlerContext["render"];
  responseNotFound: Response | HandlerContext["renderNotFound"];
  manifest: Manifest;
}

interface CreateRouteContextOptions<
  // deno-lint-ignore no-explicit-any
  TData = any,
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  params: Record<string, string>;
  state: TState;
  localAddr: Deno.NetAddr;
  remoteAddr: Deno.NetAddr;
  responseNotFound: Response | RouteContext["renderNotFound"];
  manifest: Manifest;
  data: TData;
}

interface CreateMiddlewareHandlerContextOptions<
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  params: Record<string, string>;
  state: TState;
  localAddr: Deno.NetAddr;
  remoteAddr: Deno.NetAddr;
  response: Response;
  manifest: Manifest;
  destination: MiddlewareHandlerContext["destination"];
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
    params,
    state = {} as TState,
    response,
    responseNotFound = createNotFoundResponse(),
    localAddr = createDefaultLocalAddr(url),
    remoteAddr = createDefaultRemoteAddr(url),
    manifest,
  } = options ?? {};

  function createRender() {
    if (response instanceof Response) {
      return () => response;
    }

    if (manifest) {
      return async () => {
        const route = await findMatchingRouteFromManifest(request, manifest);
        if (route && isRouteModule(route)) {
          const routeComponent = route.default;
          if (routeComponent == null) {
            return createDefaultResponse();
          }

          return renderRouteComponent(
            routeComponent,
            request,
            createRouteContext(request, { manifest }),
          );
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

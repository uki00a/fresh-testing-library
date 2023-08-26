import type {
  HandlerContext,
  Manifest,
  MiddlewareHandlerContext,
} from "$fresh/server.ts";
import {
  determineRouteDestinationKind,
  freshPathToURLPattern,
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
    response = createDefaultResponse(),
    responseNotFound = new Response("Not Found", { status: 404 }),
    localAddr = createDefaultLocalAddr(url),
    remoteAddr = createDefaultRemoteAddr(url),
    manifest,
  } = options ?? {};

  return {
    params: params ?? (manifest ? extractParams(request, manifest) : {}),
    state,
    localAddr,
    remoteAddr,
    render: response instanceof Response ? () => response : response,
    renderNotFound: responseNotFound instanceof Response
      ? () => responseNotFound
      : responseNotFound,
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

function extractParams(request: Request, manifest: Manifest) {
  const url = new URL(request.url);
  const params = Object.keys(manifest.routes).reduce(
    (params: Record<string, string>, path) => {
      const pattern = freshPathToURLPattern(path);
      const match = pattern.exec(url.href);
      if (match) {
        const { groups } = match.pathname;
        for (const name of Object.keys(groups)) {
          const value = groups[name];
          if (value) {
            params[name] = value;
          }
        }
      }
      return params;
    },
    {},
  );
  return params;
}

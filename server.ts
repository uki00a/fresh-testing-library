import type { HandlerContext } from "$fresh/server.ts";

interface CreateHandlerContextOptions<
  TState extends Record<string, unknown> = Record<string, unknown>,
> {
  params: Record<string, string>;
  state: TState;
  localAddr: Deno.NetAddr;
  remoteAddr: Deno.NetAddr;
  response: Response | HandlerContext["render"];
  responseNotFound: Response | HandlerContext["renderNotFound"];
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
      new Request(
        `http://${localAddr?.hostname ?? "localhost"}:${
          localAddr?.port ?? 8020
        }`,
      ),
      restOptions,
    );
  }

  const request: Request = requestOrOptions;
  const url = new URL(request.url);
  const {
    params = {},
    state = {} as TState,
    response = new Response("OK"),
    responseNotFound = new Response("Not Found", { status: 404 }),
    localAddr = {
      transport: "tcp" as const,
      hostname: url.hostname,
      port: Number.parseInt(url.port),
    },
    remoteAddr = {
      transport: "tcp" as const,
      hostname: url.hostname,
      port: 49152,
    },
  } = options ?? {};
  return {
    params,
    state,
    localAddr,
    remoteAddr,
    render: response instanceof Response ? () => response : response,
    renderNotFound: responseNotFound instanceof Response
      ? () => responseNotFound
      : responseNotFound,
  };
}

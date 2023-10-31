import { extname } from "node:path";
import type { ClassAttributes, VNode } from "preact";
import { h } from "preact";
import { render } from "../../deps/preact-render-to-string.ts";
import type {
  Manifest,
  MiddlewareHandler,
  PageProps,
  RouteConfig,
  RouteContext,
} from "$fresh/server.ts";

const routeExtnames = [".tsx", ".jsx", ".mts", ".ts", ".js", ".mjs"];
const kFreshRoutePathPrefix = "./routes" as const;
const kIndexRoute = "index" as const;

type FreshRoutePath = `${typeof kFreshRoutePathPrefix}/${string}`;

/**
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API}
 */
export function freshRoutePathToURLPattern(path: FreshRoutePath): URLPattern {
  return new URLPattern({
    pathname: freshRoutePathToPathToRegexPattern(path),
  });
}

function freshRoutePathToPathToRegexPattern(path: FreshRoutePath): string {
  const parts = removeExtname(
    removePrefix(path, kFreshRoutePathPrefix),
    routeExtnames,
  ).split("/");
  const pattern = parts.reduce(
    (normalizedParts: Array<string>, part, i) => {
      if (part.startsWith("[...") && part.endsWith("]")) {
        const name = part.slice(4, -1);
        normalizedParts.push(`:${name}+`);
      } else if (part.startsWith("[") && part.endsWith("]")) {
        const name = part.slice(1, -1);
        normalizedParts.push(`:${name}`);
      } else if (part.startsWith("(") && part.endsWith(")")) {
        // NOTE: a route group is ignored.
      } else if (i + 1 === parts.length && part === kIndexRoute) {
        /**
         * @example `./routes/path/to/index.tsx`
         */
        normalizedParts.push("");
      } else {
        normalizedParts.push(part);
      }
      return normalizedParts;
    },
    [],
  ).join("/");
  return (pattern.endsWith("/") && path.endsWith("/")) || pattern === "/"
    ? pattern
    : removeSuffix(pattern, "/");
}

export function determineRoute(
  request: Request,
  manifest?: Manifest,
): RouteContext["route"] {
  if (manifest == null) {
    return "/";
  }

  const maybeRouteAndPathPattern = findMatchingRouteAndPathPatternFromManifest(
    request,
    manifest,
  );
  if (maybeRouteAndPathPattern == null) {
    return "/";
  }

  const [, pattern] = maybeRouteAndPathPattern;
  return pattern;
}

type MatchingRouteAndPathPattern = [Manifest["routes"][string], string];

export function findMatchingRouteAndPathPatternFromManifest(
  request: Request,
  manifest: Manifest,
): MatchingRouteAndPathPattern | null {
  const url = new URL(request.url);
  for (const freshPath of extractFreshRoutePaths(manifest)) {
    const module = manifest.routes[freshPath];
    let pathToRegexpPattern = freshRoutePathToPathToRegexPattern(freshPath);
    if ("config" in module && (module.config as RouteConfig).routeOverride) {
      pathToRegexpPattern = String(
        (module.config as RouteConfig).routeOverride,
      );
    }
    const pattern = new URLPattern({ pathname: pathToRegexpPattern });
    const match = pattern.exec(url.href);
    if (match) {
      return [module, pathToRegexpPattern];
    }
  }
  return null;
}
type MiddlewareModule = {
  handler: MiddlewareHandler | Array<MiddlewareHandler>;
};
type RouteModule = Exclude<Manifest["routes"][string], MiddlewareModule>;
export function isRouteModule(
  module: Manifest["routes"][string],
): module is RouteModule {
  return (module as RouteModule)
    .default != null;
}

type AsyncRouteComponent = Required<RouteModule>["default"];
interface SyncRouteComponent {
  (props: PageProps): VNode;
}

export function isSyncRouteComponent(
  component: AsyncRouteComponent | SyncRouteComponent,
): component is SyncRouteComponent {
  return component.length === 1;
}

const kContainerElement = "div";
export function renderSyncRouteComponent(
  routeComponent: SyncRouteComponent,
  request: Request,
  routePattern: string,
  params: PageProps["params"],
  data: PageProps["data"],
  state: PageProps["state"],
) {
  const pageProps: PageProps = {
    url: new URL(request.url),
    route: routePattern,
    params,
    data,
    state,
  };

  // NOTE: It seems that there is a mismatch between the type definitions of `preact` and `preact-render-to-string`.
  const vnode = h(kContainerElement, {}, h(routeComponent, pageProps)) as VNode<
    ClassAttributes<HTMLElement>
  >; // TODO: remove this type casting.
  const html = render(vnode);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
  });
}

export async function renderAsyncRouteComponent(
  routeComponent: AsyncRouteComponent,
  request: Request,
  ctx: RouteContext,
): Promise<Response> {
  const result = await routeComponent(
    request,
    ctx,
  );
  if (result instanceof Response) {
    return result;
  }

  // NOTE: It seems that there is a mismatch between the type definitions of `preact` and `preact-render-to-string`.
  const vnode = h(kContainerElement, {}, result) as VNode<
    ClassAttributes<HTMLElement>
  >; // TODO: remove this type casting.
  const html = render(vnode);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
    },
  });
}

function removeExtname(path: string, knownExtnames: Array<string>): string {
  const ext = extname(path);
  return knownExtnames.includes(ext) ? removeSuffix(path, ext) : path;
}

function removePrefix(s: string, prefix: string): string {
  return s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

function removeSuffix(s: string, suffix: string): string {
  return suffix.length > 0 && s.endsWith(suffix)
    ? s.slice(0, -suffix.length)
    : s;
}

const kDestinationKindInternal = "internal" as const;
const kDesitinationKindRoute = "route" as const;
const kDesitinationKindNotFound = "notFound" as const;
// TODO: Add support for `"static"`.
// const kDesitinationKindStatic = "static" as const;
export function determineRouteDestinationKind(
  path: string,
  manifest?: Manifest,
) {
  if (path.startsWith("/_frsh")) {
    return kDestinationKindInternal;
  }

  if (manifest == null) {
    return kDesitinationKindNotFound;
  }

  for (const freshPath of extractFreshRoutePaths(manifest)) {
    const pattern = freshRoutePathToURLPattern(freshPath);
    if (pattern.test({ pathname: path })) {
      return kDesitinationKindRoute;
    }
  }

  return kDesitinationKindNotFound;
}

function extractFreshRoutePaths(manifest: Manifest): Array<FreshRoutePath> {
  return Object.keys(manifest.routes) as Array<FreshRoutePath>;
}

export function extractParams(request: Request, manifest: Manifest) {
  const url = new URL(request.url);
  const params = extractFreshRoutePaths(manifest).reduce(
    (params: Record<string, string>, path) => {
      const pattern = freshRoutePathToURLPattern(path);
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

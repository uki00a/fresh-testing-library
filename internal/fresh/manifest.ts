import { extname } from "node:path";
import type { Manifest, RouteConfig, RouteContext } from "$fresh/server.ts";

const kFreshRoutePathPrefix = "./routes" as const;
const routeExtnames = [".tsx", ".jsx", ".mts", ".ts", ".js", ".mjs"];
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

interface DefaultManifestContainer {
  manifest?: Manifest;
}
const defaultManifestContainer: DefaultManifestContainer = {};

export function setDefaultManifest(manifest: Manifest) {
  defaultManifestContainer.manifest = manifest;
}

export function maybeGetDefaultManifest(): Manifest | undefined {
  return defaultManifestContainer.manifest;
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

import { extname } from "node:path";
import type { Manifest, RouteConfig, RouteContext } from "$fresh/server.ts";

const routeExtnames = [".tsx", ".jsx", ".mts", ".ts", ".js", ".mjs"];
const kFreshPathPrefix = "./routes" as const;
const kIndexRoute = "index" as const;

type FreshPath = `${typeof kFreshPathPrefix}/${string}`;

/**
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API}
 */
export function freshPathToURLPattern(path: FreshPath): URLPattern {
  return new URLPattern({
    pathname: freshPathToPathToRegexPattern(path),
  });
}

function freshPathToPathToRegexPattern(path: FreshPath): string {
  const parts = removeExtname(
    removePrefix(path, kFreshPathPrefix),
    routeExtnames,
  ).split("/");
  const pattern = parts.map(
    (part, i) => {
      if (part.startsWith("[...") && part.endsWith("]")) {
        const name = part.slice(4, -1);
        return `:${name}+`;
      } else if (part.startsWith("[") && part.endsWith("]")) {
        const name = part.slice(1, -1);
        return `:${name}`;
      } else if (i + 1 === parts.length && part === kIndexRoute) {
        // `./routes/path/to/index.tsx`
        return "";
      } else {
        return part;
      }
    },
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

  const url = new URL(request.url);
  for (const freshPath of extractFreshPaths(manifest)) {
    const module = manifest.routes[freshPath];
    let pathToRegexpPattern = freshPathToPathToRegexPattern(freshPath);
    if ("config" in module && (module.config as RouteConfig).routeOverride) {
      pathToRegexpPattern = String(
        (module.config as RouteConfig).routeOverride,
      );
    }
    const pattern = new URLPattern({ pathname: pathToRegexpPattern });
    const match = pattern.exec(url.href);
    if (match) {
      return pathToRegexpPattern;
    }
  }

  return "/";
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

  for (const freshPath of extractFreshPaths(manifest)) {
    const pattern = freshPathToURLPattern(freshPath);
    if (pattern.test({ pathname: path })) {
      return kDesitinationKindRoute;
    }
  }

  return kDesitinationKindNotFound;
}

function extractFreshPaths(manifest: Manifest): Array<FreshPath> {
  return Object.keys(manifest.routes) as Array<FreshPath>;
}

export function extractParams(request: Request, manifest: Manifest) {
  const url = new URL(request.url);
  const params = extractFreshPaths(manifest).reduce(
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

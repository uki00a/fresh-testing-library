import { extname } from "node:path";
import type { Manifest } from "$fresh/server.ts";

const routeExtnames = [".tsx", ".jsx", ".mts", ".ts", ".js", ".mjs"];

/**
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/URL_Pattern_API}
 */
export function freshPathToURLPattern(path: string): URLPattern {
  const parts = removeExtname(removePrefix(path, "./routes"), routeExtnames)
    .split("/");
  const pattern = parts.map(
    (part, i) => {
      if (part.startsWith("[...") && part.endsWith("]")) {
        const name = part.slice(4, -1);
        return `:${name}+`;
      } else if (part.startsWith("[") && part.endsWith("]")) {
        const name = part.slice(1, -1);
        return `:${name}`;
      } else if (i + 1 === parts.length && part === "index") {
        // `./routes/path/to/index.tsx`
        return "";
      } else {
        return part;
      }
    },
  ).join("/");
  return new URLPattern({
    pathname: (pattern.endsWith("/") && path.endsWith("/")) || pattern === "/"
      ? pattern
      : removeSuffix(pattern, "/"),
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

  for (const freshPath of Object.keys(manifest.routes)) {
    const pattern = freshPathToURLPattern(freshPath);
    if (pattern.test({ pathname: path })) {
      return kDesitinationKindRoute;
    }
  }

  return kDesitinationKindNotFound;
}

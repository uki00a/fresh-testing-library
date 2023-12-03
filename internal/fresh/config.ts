import { join } from "node:path";
import type {
  FreshConfig,
  Manifest,
  RenderFunction,
  ResolvedFreshConfig,
} from "$fresh/server.ts";

const kFreshBuildDir = "_fresh";
const kFreshStaticDir = "static";

export function resolveConfig(
  config: FreshConfig,
  manifest?: Manifest,
): ResolvedFreshConfig {
  return {
    dev: true,
    build: {
      outDir: manifest
        ? join(new URL(manifest.baseUrl).pathname, kFreshBuildDir)
        : kFreshBuildDir,
      target: [],
      ...config.build,
    },
    staticDir: config.staticDir ??
      (manifest
        ? join(new URL(manifest.baseUrl).pathname, kFreshStaticDir)
        : kFreshStaticDir),
    plugins: config.plugins ?? [],
    router: config.router,
    basePath: config.router?.basePath ?? "",
    server: config.server ?? {},
    render: config.render ?? render,
  };
}

const render: RenderFunction = () => {
  throw new Error("`ResolvedFreshConfig.render` is not implemented yet.");
};

import { Project } from "../deps/ts_morph.ts";
import { walk } from "$std/fs/walk.ts";
import { isAbsolute } from "node:path";

async function checkImports(): Promise<void> {
  const project = new Project({ useInMemoryFileSystem: true });
  const rootDir = new URL(import.meta.resolve("../"));
  for await (
    const entry of walk(rootDir, {
      includeDirs: false,
      skip: [
        /\.git/,
        /\/demo\//,
        /\/testdata\//,
        /\/tools\//,
        /\.test.ts(x)?$/,
      ],
      exts: [".tsx", ".ts"],
    })
  ) {
    const basename = entry.path.slice(rootDir.pathname.length);
    const text = await Deno.readTextFile(entry.path);
    const sourceFile = project.createSourceFile(entry.path, text);
    try {
      const imports = sourceFile.getImportDeclarations();
      for (const x of imports) {
        const specifier = x.getModuleSpecifierValue();
        if (isAllowedSpecifier(specifier)) continue;
        throw new Error(`${basename}: '${specifier}' is not allowed.`);
      }

      const exports = sourceFile.getExportDeclarations();
      for (const x of exports) {
        const specifier = x.getModuleSpecifierValue();
        if (specifier == null || isAllowedSpecifier(specifier)) continue;
        throw new Error(`${basename}: '${specifier}' is not allowed.`);
      }
    } finally {
      project.removeSourceFile(sourceFile);
    }
  }
}

function isAllowedSpecifier(specifier: string): boolean {
  if (
    specifier.startsWith("npm:") || specifier.startsWith("node:") ||
    URL.canParse(specifier)
  ) {
    return true;
  }

  if (isAbsolute(specifier) || isRelative(specifier)) {
    return true;
  }

  // Bare specifiers
  return specifier.startsWith("$fresh/");
}

function isRelative(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}

try {
  await checkImports();
} catch (error) {
  console.error(error);
  Deno.exit(1);
}

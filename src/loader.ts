import type { LoadHook, ResolveHook } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, extname } from "node:path";
import { ResolverFactory } from "oxc-resolver";
import { transformFile } from "@swc/core";
import { migrateOptions as migrate } from "tsconfig-migrate/swc.js";
import { parse } from "tsconfck";

const { tsconfig, tsconfigFile } = await (async () => {
  try {
    return await parse("tsconfig.json");
  } catch {
    return {
      tsconfig: {},
      tsconfigFile: undefined,
    };
  }
})();

const isModule = tsconfig.compilerOptions?.module?.toLowerCase() !== "commonjs";

const transformOptions = migrate({
  ...tsconfig.compilerOptions,
  declaration: false,
  sourceMap: true,
  inlineSourceMap: true,
  importHelpers: false,
});

const tsExtensions = new Set([".ts", ".mts", ".cts", ".tsx"]);
const extensions = [...tsExtensions, ".js", ".mjs", ".cjs", ".jsx", ".json", ".wasm", ".node"];

const rf = new ResolverFactory({
  conditionNames: [...(isModule ? ["import", "module"] : ["require"]), "node"],
  tsconfig: tsconfigFile
    ? {
        configFile: tsconfigFile,
        references: "auto",
      }
    : undefined,
  extensions,
  extensionAlias: {
    ".js": [".ts", ".tsx", ".js", ".jsx"],
    ".cjs": [".cts", ".cjs"],
    ".mjs": [".mts", ".mjs"],
    ".jsx": [".tsx", ".jsx"],
  },
  moduleType: true,
});

export const resolve: ResolveHook = async (specifier, context, defaultResolve) => {
  const { parentURL } = context;
  if (!parentURL) {
    return defaultResolve(specifier, context);
  }
  const request = specifier;
  const rr = await rf.async(dirname(fileURLToPath(parentURL)), request);
  if (!rr.path) {
    return defaultResolve(specifier, context);
  }
  return {
    url: pathToFileURL(rr.path).toString(),
    format: rr.moduleType,
    shortCircuit: true,
  };
};

export const load: LoadHook = async (url, context, defaultLoad) => {
  if (!url.startsWith("file:")) {
    return defaultLoad(url, context);
  }
  const filePath = fileURLToPath(url);
  const ext = extname(filePath);
  if (tsExtensions.has(ext)) {
    const { code } = await transformFile(filePath, transformOptions);
    let format: "commonjs" | "module";
    switch (ext) {
      case ".cts":
        format = "commonjs";
        break;
      case ".mts":
      case ".tsx":
        format = "module";
        break;
      default:
        format = isModule ? "module" : "commonjs";
    }
    return {
      format,
      source: code,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context);
};

export const loaderURL = import.meta.url;

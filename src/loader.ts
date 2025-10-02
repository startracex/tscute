import type { LoadHook, ResolveHook } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, extname } from "node:path";
import { ResolverFactory } from "oxc-resolver";
import { transformFile } from "@swc/core";
import { migrateOptions as migrate } from "tsconfig-migrate/swc.js";
import { parse } from "tsconfck";

const tsExtensions = new Set([".ts", ".mts", ".cts", ".tsx"]);
const extensions = [...tsExtensions, ".js", ".mjs", ".cjs", ".jsx", ".json", ".wasm", ".node"];

interface InitResult {
  tsconfig: any;
  tsconfigFile: string | undefined;
  isModule: boolean;
  transformOptions: any;
  resolverFactor: ResolverFactory;
}

let initResult: InitResult | null = null;

const init = async (): Promise<InitResult> => {
  if (initResult) {
    return initResult;
  }

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

  const rf: ResolverFactory = new ResolverFactory({
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

  initResult = { tsconfig, tsconfigFile, isModule, transformOptions, resolverFactor: rf };
  return initResult;
};

export const resolve: ResolveHook = async (specifier, context, defaultResolve) => {
  const { resolverFactor: rf } = await init();
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
  const { transformOptions, isModule } = await init();
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

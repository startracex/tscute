import { readFileSync } from "node:fs";
import type { LoadHookSync, ResolveHookSync } from "node:module";
import { dirname, extname } from "node:path";
import { transformSync } from "esbuild";
import { getTsconfig } from "get-tsconfig";
import { ResolverFactory } from "oxc-resolver";
import { isFileProto, toFileURLPath, toPath } from "./url.ts";

type NodeFormat = "commonjs" | "module";

const tsExtensions = new Set([".ts", ".mts", ".cts", ".tsx"]);
const extensions = [...tsExtensions, ".js", ".mjs", ".cjs", ".jsx", ".json", ".wasm", ".node"];

const nodeFormatFor = (ext: string, isModule: boolean): NodeFormat => {
  switch (ext) {
    case ".cts":
      return "commonjs";
    case ".mts":
    case ".tsx":
      return "module";
    default:
      return isModule ? "module" : "commonjs";
  }
};

interface InitResult {
  tsconfig: any;
  tsconfigFile: string | undefined;
  isModule: boolean;
  resolverFactor: ResolverFactory;
}

let initResult: InitResult | null = null;

const init = (): InitResult => {
  if (initResult) {
    return initResult;
  }

  const result = (() => {
    try {
      return getTsconfig();
    } catch {
      return null;
    }
  })();
  const tsconfig = result?.config ?? {};
  const tsconfigFile = result?.path;

  const isModule = tsconfig.compilerOptions?.module?.toLowerCase() !== "commonjs";

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

  initResult = { tsconfig, tsconfigFile, isModule, resolverFactor: rf };
  return initResult;
};

export const resolve: ResolveHookSync = (specifier, context, nextResolve) => {
  const { resolverFactor: rf } = init();
  const { parentURL } = context;
  if (!parentURL) {
    return nextResolve(specifier, context);
  }
  const request = specifier;
  const rr = rf.sync(dirname(toPath(parentURL)), request);
  if (!rr.path) {
    return nextResolve(specifier, context);
  }
  return {
    url: toFileURLPath(rr.path),
    format: rr.moduleType,
    shortCircuit: true,
  };
};

export const load: LoadHookSync = (url, context, nextLoad) => {
  const { tsconfig, isModule } = init();
  if (!isFileProto(url)) {
    return nextLoad(url, context);
  }
  const filePath = toPath(url);
  const ext = extname(filePath);
  if (tsExtensions.has(ext)) {
    const format = nodeFormatFor(ext, isModule);
    const { code } = transformSync(readFileSync(filePath, "utf8"), {
      loader: ext === ".tsx" ? "tsx" : "ts",
      format: format === "module" ? "esm" : "cjs",
      sourcefile: filePath,
      sourcemap: "inline",
      target: tsconfig.compilerOptions?.target?.toLowerCase() ?? "esnext",
      tsconfigRaw: {
        compilerOptions: tsconfig.compilerOptions ?? {},
      },
    });
    return {
      format,
      source: code,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
};

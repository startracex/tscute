import { fileURLToPath, pathToFileURL } from "url";
import { ResolverFactory } from "oxc-resolver";
import { dirname, extname } from "path";
import type { LoadHook, ResolveHook } from "module";
import { transform } from "oxc-transform";
import { readFile } from "fs/promises";
import migrate from "tsconfig-migrate/oxc.js";
import { parse } from "tsconfck";
import { Buffer } from "node:buffer";

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

const transformOptions = migrate({
  ...tsconfig.compilerOptions,
  declaration: false,
  declarationMap: false,
  sourceMap: true,
});

const tsExtensions = new Set([".ts", ".mts", ".cts", ".tsx"]);
const extensions = new Set([...tsExtensions, ".js", ".mjs", ".cjs", ".jsx", ".json", ".wasm", ".node"]);

const rf = new ResolverFactory({
  conditionNames: ["import", "module", "node"],
  tsconfig: tsconfigFile
    ? {
        configFile: tsconfigFile,
        references: "auto",
      }
    : undefined,
  extensions: [...extensions],
  extensionAlias: {
    ".js": [".ts", ".tsx", ".js"],
    ".cjs": [".cts", ".cjs"],
    ".mjs": [".mts", ".mjs"],
    ".jsx": [".tsx", ".jsx"],
  },
});

export const resolve: ResolveHook = async (specifier, context, defaultResolve) => {
  const { parentURL } = context;
  if (!parentURL) {
    return defaultResolve(specifier, context);
  }
  let request = specifier;
  const ext = extname(specifier);
  if (ext && extensions.has(ext)) {
    request = specifier.slice(0, -ext.length);
  }
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
    const transformResult = transform(filePath, await readFile(filePath, "utf-8"), transformOptions);

    const map = Buffer.from(JSON.stringify(transformResult.map)).toString("base64");
    const code = `${transformResult.code}
//# sourceMappingURL=data:application/json;base64,${map}`;
    return {
      format: "module",
      source: code,
      shortCircuit: true,
    };
  }

  return defaultLoad(url, context);
};

export const loaderURL = import.meta.url;

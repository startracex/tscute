import { type ChildProcess, spawn, spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { registerURL } from "./loader-register.ts";

const importArgs = ["--import", registerURL];

export const executeScript = (...args: string[]) => {
  const spawnArgs = [...importArgs, ...args];
  return spawnSync(process.execPath, spawnArgs, {
    stdio: "inherit",
  });
};

const message = (childProcess: ChildProcess) => {
  return new Promise((resolve, reject) => {
    childProcess.on("message", resolve);
    childProcess.on("error", reject);
    childProcess.on("exit", reject);
  });
};

const createRunner = (workerPath: string) => {
  return async (...args: string[]): Promise<Record<string, any> | null> => {
    const child = spawn(process.execPath, [...importArgs, workerPath, ...args], {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
    });
    try {
      return (await message(child)) as any;
    } catch {
      return null;
    }
  };
};

const dir = dirname(fileURLToPath(import.meta.url));

export const importModule = createRunner(join(dir, "worker-import.js"));
export const requireModule = createRunner(join(dir, "worker-require.js"));

#!/usr/bin/env node
import process from "node:process";
import { spawnSync } from "node:child_process";
import { registerURL } from "./loader-register.ts";

export const execute = (args: string[]) => {
  const spawnArgs = ["--import", registerURL, ...args];
  const result = spawnSync(process.execPath, spawnArgs, {
    stdio: "inherit",
  });
  process.exit(result.status || (result.error ? 1 : 0));
};

execute(process.argv.slice(2));

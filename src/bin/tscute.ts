#!/usr/bin/env node
import process from "node:process";
import { spawnSync } from "child_process";
import { registerURL } from "../loader-register.ts";

const executeScript = (...args: string[]): ReturnType<typeof spawnSync> => {
  return spawnSync(process.execPath, ["--import", registerURL, ...args], {
    stdio: "inherit",
  });
};

executeScript(...process.argv.slice(2));

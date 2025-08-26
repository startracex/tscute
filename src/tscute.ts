#!/usr/bin/env node
import process from "node:process";
import { spawnSync } from "node:child_process";
import { registerURL } from "./loader-register.ts";

const spawnArgs = ["--import", registerURL, ...process.argv.slice(2)];
const result = spawnSync(process.execPath, spawnArgs, {
  stdio: "inherit",
});
process.exit(result.status || (result.error ? 1 : 0));

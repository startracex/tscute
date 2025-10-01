#!/usr/bin/env node
import process from "node:process";
import { executeScript } from "../subproc.ts";

executeScript(process.argv.slice(2))

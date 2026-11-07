import { registerHooks } from "node:module";
import { load, resolve } from "./loader.ts";

export const registerURL: string = import.meta.url;

registerHooks({ resolve, load });

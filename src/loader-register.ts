import { register } from "node:module";
import { loaderURL } from "./loader.ts";

export const registerURL = import.meta.url;

register(loaderURL, registerURL);

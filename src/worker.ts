import { pathToFileURL } from "url";
import { resolve } from "path";

const targetPath = process.argv[2];
const targetUrl = pathToFileURL(resolve(targetPath)).href;
import(targetUrl).then((mod) => process.send(mod));

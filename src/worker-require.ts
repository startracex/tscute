import { createRequire } from "module";
import path from "path";
import { __importStar } from "tslib";

const targetPath = path.resolve(process.argv[2]);
const require = global.require ?? createRequire(import.meta.url);
process.send(__importStar(require(targetPath)));

# tscute

## Execute script

```sh
tscute bin-file.ts
```

```js
import { executeScript } from "tscute";

await executeScript("./bin-file.ts");
```

## Import/Require module

```js
import { importModule, requireModule } from "tscute";

var exports = await importModule("./mod-file.ts");

var exports = await requireModule("./mod-file.ts");
```

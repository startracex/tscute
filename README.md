# tscute

## Execute script

```sh
tscute bin-file.ts
```

```js
import { executeScript } from "tscute";

await executeScript("./bin-file.ts");
```

## Import module

```js
import { importModule } from "tscute";

const exports = await importModule("./mod-file.ts");
```

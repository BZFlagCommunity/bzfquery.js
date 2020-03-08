# bzfquery.js

JavaScript version of bzfquery. Requires [Deno](https://deno.land) to run. It can also be used as a library.

Usage: `deno --allow-net bzfquery.ts host:port`

Use in your code
```typescript
import bzfquery from "https://raw.githubusercontent.com/The-Noah/bzfquery.js/master/bzfquery.ts";

bzfquery("localhost", 5154).then((data) => console.log(JSON.stringify(data, null, 2)));
```

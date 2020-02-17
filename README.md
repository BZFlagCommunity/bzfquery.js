# bzfquery.js

JavaScript version of bzfquery. Requires [Deno](https://deno.land) to run. It can also be used as a library.

Usage: `deno --allow-net bzfquery.ts host:port`

Use in your code
```javascript
import bzfquery from "./bzfquery.ts";

bzfquery(host, port).then((data) => console.log(JSON.stringify(data, null, 2)));
```

# bzfquery.js

JavaScript (TypeScript) version of bzfquery. Requires [Deno](https://deno.land) to run. It can also be used as a library.

Usage: `deno run --allow-net bzfquery.ts host:port`

Use in your code
```typescript
import bzfquery from "https://raw.githubusercontent.com/The-Noah/bzfquery.js/master/bzfquery.ts";

bzfquery("localhost", 5154).then((data) => console.log(JSON.stringify(data, null, 2)));
```

Use without downloading: `deno run --allow-net https://raw.githubusercontent.com/The-Noah/bzfquery.js/master/bzfquery.ts host:port`

# Types

| Name       | Type |
| ---------- | ---- |
| `TeamName` | `"Rogue" \| "Red" \| "Green" \| "Blue" \| "Purple" \| "Observer" \| "Rabbit" \| "Hunter"` |

## IBZFQuery

| Property         | Type | Extra Info |
| ---------------- | ---- | ---------- |
| `style`          | `"FFA" \| "CTF" \| "OFFA" \| "Rabbit"` |
| `options`        | `IGameOptions` |
| `teams`          | `ITeam[]` |
| `players`        | `IPlayer[]` |
| `maxPlayerScore` | `number` |
| `maxTeamScore`   | `number` |
| `maxPlayers`     | `number` |
| `maxShots`       | `number` |
| `timeLimit`      | `number` | Measured in deciseconds |
| `elapsedTime`    | `number` | Measured in deciseconds |
| `shake`          | `false \| {wins: number, timeout: number}` | `timeout` is in deciseconds |

## IGameOptions

| Property       | Type      |
| -------------- | --------- |
| `flags`        | `boolean` |
| `jumping`      | `boolean` |
| `inertia`      | `boolean` |
| `ricochet`     | `boolean` |
| `shaking`      | `boolean` |
| `antidote`     | `boolean` |
| `handicap`     | `boolean` |
| `noTeamKiils`  | `boolean` |

## ITeam

| Property     | Type       | Extra Info |
| ------------ | ---------- | ---------- |
| `name`       | `TeamName` |
| `players`    | `number`   |
| `maxPlayers` | `number`   |
| `wins`       | `number`   | (Optional) does not exist on `Observer` team |
| `losses`     | `TeamName` | (Optional) does not exist on `Observer` team |

## IPlayer

| Property   | Type       | Extra Info |
| ---------- | ---------- | ---------- |
| `team`     | `TeamName` |
| `wins`     | `number`   |
| `losses`   | `number`   |
| `tks`      | `number`   |
| `callsign` | `string`   |
| `motto`    | `string`   | May be an empty `string` |

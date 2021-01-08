# bzfquery.js

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/The-Noah/bzfquery.js)](https://deno.land/x/bzfquery)
[![GitHub license](https://img.shields.io/github/license/The-Noah/bzfquery.js)](LICENSE)
[![Deno test](https://img.shields.io/badge/Deno-v1.5.4-blue?logo=deno)](https://github.com/denoland/deno/releases/tag/v1.5.4)
![CI](https://github.com/The-Noah/bzfquery.js/workflows/CI/badge.svg)

JavaScript (TypeScript) version of bzfquery with no external dependencies. Requires [Deno](https://deno.land) to run. It can also be used as a library or from the command line.

Usage: `deno run --allow-net bzfquery.ts host[:port]`

Use in your code
```typescript
import bzfquery from "https://deno.land/x/bzfquery/bzfquery.ts";

console.log(JSON.stringify(await bzfquery("bzflag.ns01.biz", 5154), null, 2));
```

Use without downloading project:
```sh
deno install --allow-net https://deno.land/x/bzfquery/bzfquery.ts
bzfquery host[:port]
```

Stable documentation can be found [here](https://doc.deno.land/https/deno.land/x/bzfquery/bzfquery.ts), and latest unstable docs [here](https://doc.deno.land/https/raw.githubusercontent.com/The-Noah/bzfquery.js/master/bzfquery.ts).

# Types

| Name       | Type |
| ---------- | ---- |
| `GameStyle` | `"FFA"` or `"CTF"` or `"OFFA"` or `"Rabbit"` |
| `TeamName` | `"Rogue"` or `"Red"` or `"Green"` or `"Blue"` or `"Purple"` or `"Observer"` or `"Rabbit"` or `"Hunter"` |

## IBZFQuery

| Property         | Type | Extra Info |
| ---------------- | ---- | ---------- |
| `style`          | `GameStyle` |
| `options`        | `IGameOptions` |
| `teams`          | `ITeam[]` |
| `players`        | `IPlayer[]` |
| `maxPlayerScore` | `number` |
| `maxTeamScore`   | `number` |
| `maxPlayers`     | `number` |
| `maxShots`       | `number` |
| `timeLimit`      | `number` | Measured in deciseconds |
| `elapsedTime`    | `number` | Measured in deciseconds |
| `shake`          | `false` or `{wins: number, timeout: number}` | `timeout` is in deciseconds |

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

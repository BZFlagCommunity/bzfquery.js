/*
 * MIT License
 *
 * Copyright (c) 2020 The Noah
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 */

import jspack from "./jspack.ts";

const PROTOCOL = "0221"; // bzfs protocol version

export type GameStyle = "FFA" | "CTF" | "OFFA" | "Rabbit";
export type TeamName = "Rogue" | "Red" | "Green" | "Blue" | "Purple" | "Observer" | "Rabbit" | "Hunter";

export interface IBZFQuery{
  style: GameStyle;
  options: IGameOptions;
  teams: ITeam[];
  players: IPlayer[];
  maxPlayerScore: number;
  maxTeamScore: number;
  maxPlayers: number;
  maxShots: number;
  timeLimit: number;
  elapsedTime: number;
  shake: false | {wins: number, timeout: number};
}

export interface IGameOptions{
  [key: string]: boolean;
  flags: boolean;
  jumping: boolean;
  inertia: boolean;
  ricochet: boolean;
  shaking: boolean;
  antidote: boolean;
  handicap: boolean;
  noTeamKills: boolean;
}

export interface ITeam{
  name: TeamName;
  players: number;
  maxPlayers: number;
  wins?: number;
  losses?: number;
}

export interface IPlayer{
  team: TeamName;
  wins: number;
  losses: number;
  tks: number;
  callsign: string;
  motto: string;
}

// must match GameType order at https://github.com/BZFlag-Dev/bzflag/blob/2.4/include/global.h#L89-L95
const gameStyles = ["FFA", "CTF", "OFFA", "Rabbit"];
// must match TeamColor order at https://github.com/BZFlag-Dev/bzflag/blob/2.4/include/global.h#L54-66
const teamNames = ["Rogue", "Red", "Green", "Blue", "Purple", "Observer", "Rabbit", "Hunter"];

// must match GameOptions at https://github.com/BZFlag-Dev/bzflag/blob/2.4/include/global.h#L97-L108
const gameOptions: {[key: string]: number} = {
  flags: 0x0002,
  jumping: 0x0008,
  inertia: 0x0010,
  ricochet: 0x0020,
  shaking: 0x0040,
  antidote: 0x0080,
  handicap: 0x0100,
  noTeamKills: 0x0400
};

// must match https://github.com/BZFlag-Dev/bzflag/blob/2.4/include/Protocol.h
const messages = {
  queryGame: 0x7167,
  queryPlayers: 0x7170,
  teamUpdate: 0x7475,
  addPlayer: 0x6170
};

const decodeOptions = (options: number): IGameOptions => {
  const _gameOptions = {} as IGameOptions;

  for(const option in gameOptions) {
    if(!gameOptions.hasOwnProperty(option)){
      console.error("game options decoding failed! this should not happen");
      return {} as IGameOptions;
    }

    _gameOptions[option] = (options & gameOptions[option]) > 0;
  }

  return _gameOptions;
};

/**
 * Query the given game server
 * @param host Server hostname/ip
 * @param port Server port
 * Example:
 * 
 *     const query = bzfquery("127.0.0.1", 5156);
 */
export const bzfquery = async (host: string = "127.0.0.1", port: number = 5154): Promise<IBZFQuery | undefined> => {
  let conn: Deno.Conn;
  try{
    conn = await Deno.connect({
      hostname: host,
      port
    });
  }catch(err){
    console.error(`unable to connect to ${host}:${port}:`, err);
    return;
  }

  let buffer = new Uint8Array(1024);

  // send header
  await conn.write(new TextEncoder().encode("BZFLAG\r\n\r\n"));

  await conn.read(buffer);
  const magic = new TextDecoder("utf-8").decode(buffer);

  if(magic.substr(0, 4) !== "BZFS"){
    console.error("not a bzflag server");
    return;
  }else if(magic.substr(4, 4) !== PROTOCOL){
    console.error("incompatible version");
    return;
  }

  const getPacket = async (): Promise<{code: string, buffer: Uint8Array}> => {
    let buffer = new Uint8Array(4);
    await conn.read(buffer);
    const [size, code] = jspack.Unpack(">H2s", buffer);
    buffer = new Uint8Array(size);
    await conn.read(buffer);

    return {code, buffer};
  };

  const getResponse = async (expectedCode: number): Promise<Uint8Array> => {
    const timeLimit = new Date().getTime() + 5000;
    const codeStr = new TextDecoder("utf-8").decode(new Uint8Array([expectedCode >> 8, expectedCode & 0XFF]));

    while(new Date().getTime() < timeLimit){
      const {code, buffer} = await getPacket();
      if(code === codeStr){
        return buffer;
      }
    }

    return new Uint8Array([]);
  };

  const cmd = async (command: number): Promise<Uint8Array> => {
    const data = jspack.Pack(">2H", [0, command]);
    if(!data){
      return new Uint8Array();
    }

    await conn.write(new Uint8Array(data));
    const buffer = await getResponse(command);
    return buffer;
  };

  buffer = await cmd(messages.queryGame);
  const [
    style,
    options,
    maxPlayers,
    maxShots,
    ,,,,, // unused team sizes
    observerSize,
    rogueMax,
    redMax,
    greenMax,
    blueMax,
    purpleMax,
    observerMax,
    shakeWins,
    shakeTimeout,
    maxPlayerScore,
    maxTeamScore,
    maxTime,
    elapsedTime
  ] = jspack.Unpack(">22H", buffer);

  buffer = await cmd(messages.queryPlayers);
  const [, numPlayers] = jspack.Unpack(">2H", buffer);

  buffer = await getResponse(messages.teamUpdate);
  const numTeams = buffer[0];
  buffer = buffer.slice(1);

  const teamMaxSizes = [rogueMax, redMax, greenMax, blueMax, purpleMax];
  const teams: ITeam[] = [];
  for(let i = 0; i < numTeams; i++){
    const teamInfo = buffer.slice(0, 8);
    buffer = buffer.slice(8);

    const [team, size, wins, losses] = jspack.Unpack(">4H", teamInfo);
    if(teamMaxSizes[team] < 1){
      continue;
    }

    teams.push({name: teamNames[team] as TeamName, players: size, maxPlayers: teamMaxSizes[team], wins, losses});
  }
  teams.push({name: "Observer", players: observerSize, maxPlayers: observerMax});

  const players: IPlayer[] = [];
  for(let i = 0; i < numPlayers; i++){
    buffer = await getResponse(messages.addPlayer);
    const [id, type, team, wins, losses, tks, callsign, motto] = jspack.Unpack(">b5H32s128s", buffer);
    players.push({team: teamNames[team] as TeamName, wins, losses, tks, callsign: callsign.replace(/\x00/g, ""), motto: motto.replace(/\x00/g, "")});
  }

  const gameStyle = gameStyles[style] as GameStyle;
  const gameOptions = decodeOptions(options);

  const info: IBZFQuery = {
    style: gameStyle,
    options: gameOptions,
    teams,
    players,
    maxPlayerScore: maxPlayerScore,
    maxTeamScore: maxTeamScore,
    maxPlayers: maxPlayers,
    maxShots: maxShots,
    timeLimit: maxTime,
    elapsedTime: elapsedTime,
    shake: false
  };

  if(gameOptions.shaking){
    info.shake = {
      wins: shakeWins,
      timeout: shakeTimeout
    };
  }

  conn.close();

  return info;
};

if(import.meta.main && Deno.args.length === 1){
  const host = Deno.args[0].split(":")[0];
  const port = parseInt(Deno.args[0].split(":")[1]) || undefined;

  bzfquery(host, port).then((data) => console.log(JSON.stringify(data, null, 2)));
}

export default bzfquery;

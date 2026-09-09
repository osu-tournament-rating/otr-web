import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

import { Mods, Ruleset } from '@otr/core/osu';
import type {
  PlayerStats,
  PlayerStatsDuo,
  PlayerStatsPlayer,
} from '@otr/core/stats/player-stats';

/** Real rated players from the disposable clone, so avatars and links resolve. */
type SeedPlayer = {
  id: number;
  osuId: number;
  username: string;
  country: string;
  rating: number | null;
};

const OSU_PLAYERS: SeedPlayer[] = [
  {
    id: 4285,
    osuId: 12408961,
    username: 'MALISZEWSKI',
    country: 'PL',
    rating: 3067,
  },
  { id: 2904, osuId: 7562902, username: 'mrekk', country: 'AU', rating: 3041 },
  {
    id: 5403,
    osuId: 8116659,
    username: 'criller',
    country: 'DE',
    rating: 2831,
  },
  {
    id: 6666,
    osuId: 14106450,
    username: 'worst hr player',
    country: 'KR',
    rating: 2816,
  },
  {
    id: 2182,
    osuId: 9224078,
    username: 'FlyingTuna',
    country: 'KR',
    rating: 2751,
  },
  {
    id: 1655,
    osuId: 7341183,
    username: 'ASecretBox',
    country: 'AU',
    rating: 2699,
  },
  { id: 3853, osuId: 7512553, username: 'Utami', country: 'US', rating: 2688 },
  {
    id: 6188,
    osuId: 11443437,
    username: '[Karcher]',
    country: 'KR',
    rating: 2595,
  },
  {
    id: 825,
    osuId: 7813296,
    username: 'rektygon',
    country: 'US',
    rating: 2590,
  },
  {
    id: 5413,
    osuId: 8472976,
    username: 'Suyung_',
    country: 'KR',
    rating: 2583,
  },
  { id: 1604, osuId: 2165650, username: 'mcy4', country: 'HK', rating: 2547 },
  {
    id: 31160,
    osuId: 14676719,
    username: 'TTv_UFO',
    country: 'US',
    rating: 2539,
  },
  {
    id: 2675,
    osuId: 11375105,
    username: 'lolol233',
    country: 'CN',
    rating: 2520,
  },
  { id: 5432, osuId: 8640970, username: 'enri', country: 'PH', rating: 2513 },
  {
    id: 7508,
    osuId: 16817965,
    username: 'Kamensh1k',
    country: 'KZ',
    rating: 2495,
  },
  {
    id: 5557,
    osuId: 5645231,
    username: 'decaten',
    country: 'US',
    rating: 2483,
  },
  {
    id: 9631,
    osuId: 11226645,
    username: 'JackPaX',
    country: 'GR',
    rating: 2482,
  },
  { id: 7351, osuId: 10651106, username: 'Pezz', country: 'US', rating: 2474 },
  {
    id: 2595,
    osuId: 12434652,
    username: 'Gonzah',
    country: 'CL',
    rating: 2468,
  },
  { id: 5464, osuId: 9405745, username: 'scylla', country: 'SE', rating: 2466 },
  {
    id: 3008,
    osuId: 2291265,
    username: 'Arnold24x24',
    country: 'PE',
    rating: 2465,
  },
  {
    id: 1403,
    osuId: 8007528,
    username: 'Raikouhou',
    country: 'TR',
    rating: 2459,
  },
  {
    id: 9184,
    osuId: 11552867,
    username: 'Welter',
    country: 'RU',
    rating: 2454,
  },
  {
    id: 3204,
    osuId: 3717598,
    username: 'xootynator',
    country: 'CA',
    rating: 2445,
  },
  { id: 769, osuId: 1473890, username: 'badeu', country: 'RO', rating: 2445 },
  {
    id: 6198,
    osuId: 5199332,
    username: 'Chicony',
    country: 'RU',
    rating: 2441,
  },
  {
    id: 16517,
    osuId: 13108233,
    username: 'milosz',
    country: 'PL',
    rating: 2438,
  },
  {
    id: 6717,
    osuId: 10549880,
    username: 'NINERIK',
    country: 'NO',
    rating: 2428,
  },
  { id: 3448, osuId: 284905, username: 'Ekoro', country: 'FR', rating: 2423 },
  { id: 740, osuId: 1646397, username: 'Crystal', country: 'CN', rating: 2417 },
  {
    id: 2147,
    osuId: 7075211,
    username: 'tekkito',
    country: 'US',
    rating: 2401,
  },
  {
    id: 7167,
    osuId: 2511839,
    username: 'NeliNyan',
    country: 'KR',
    rating: 2392,
  },
  {
    id: 5436,
    osuId: 4734703,
    username: 'NathanRam1918',
    country: 'PH',
    rating: 2390,
  },
  {
    id: 17190,
    osuId: 11399348,
    username: 'fragranceofpage',
    country: 'KR',
    rating: 2386,
  },
  { id: 9329, osuId: 9938943, username: 'aknzx', country: 'AU', rating: 2365 },
  {
    id: 2274,
    osuId: 6090175,
    username: 'lolol235',
    country: 'CN',
    rating: 2351,
  },
  {
    id: 5420,
    osuId: 4511522,
    username: 'Doomsday fanboy',
    country: 'KR',
    rating: 2340,
  },
  {
    id: 12465,
    osuId: 14503423,
    username: 'misha awa',
    country: 'HK',
    rating: 2330,
  },
  {
    id: 2062,
    osuId: 2546001,
    username: 'Intercambing',
    country: 'CL',
    rating: 2325,
  },
  {
    id: 9235,
    osuId: 4108547,
    username: 'WindowLife',
    country: 'US',
    rating: 2325,
  },
];

const TAIKO_PLAYERS: SeedPlayer[] = [
  {
    id: 2967,
    osuId: 9540073,
    username: 'Grape_Tea',
    country: 'JP',
    rating: 2569,
  },
  {
    id: 3451,
    osuId: 165027,
    username: 'Peaceful',
    country: 'KR',
    rating: 2418,
  },
  {
    id: 1477,
    osuId: 7609510,
    username: 'Blerargh',
    country: 'SG',
    rating: 2335,
  },
  {
    id: 14710,
    osuId: 4669728,
    username: 'BabySnakes',
    country: 'PT',
    rating: 2321,
  },
  {
    id: 3038,
    osuId: 15252950,
    username: 'Seren58',
    country: 'JP',
    rating: 2266,
  },
  {
    id: 1457,
    osuId: 8057655,
    username: 'goheegy',
    country: 'GB',
    rating: 2232,
  },
  { id: 1510, osuId: 1263669, username: 'ulko', country: 'CL', rating: 2218 },
  {
    id: 15613,
    osuId: 11680357,
    username: 'kanten_07',
    country: 'JP',
    rating: 2199,
  },
];

const MANIA4K_PLAYERS: SeedPlayer[] = [
  {
    id: 2937,
    osuId: 10072733,
    username: 'myucchii',
    country: 'CL',
    rating: 2629,
  },
  {
    id: 9802,
    osuId: 11734610,
    username: 'Nepijin',
    country: 'US',
    rating: 2621,
  },
  {
    id: 14551,
    osuId: 15665805,
    username: 'konkawe',
    country: 'TH',
    rating: 2591,
  },
  { id: 18394, osuId: 8534840, username: 'DawnX', country: 'CN', rating: 2345 },
  { id: 14674, osuId: 13385865, username: 'Reyi', country: 'ID', rating: 2314 },
  {
    id: 14549,
    osuId: 12046267,
    username: '--Pavin--',
    country: 'TH',
    rating: 2248,
  },
  {
    id: 14644,
    osuId: 10083439,
    username: 'bojii',
    country: 'PH',
    rating: 2225,
  },
  {
    id: 18765,
    osuId: 23248427,
    username: '-Veloce-',
    country: 'TW',
    rating: 2195,
  },
];

/** Verified tournaments and matches that exist in the clone. */
const TOURNAMENTS = [
  {
    id: 3306,
    abbreviation: '5USC26',
    name: '5 Digit United States Cup 2026 Minor League',
    matchId: 162842,
  },
  {
    id: 3303,
    abbreviation: 'ONAC',
    name: 'osu! North African Cup 2026',
    matchId: 162780,
  },
  {
    id: 3302,
    abbreviation: 'OKT2026',
    name: 'osu! Korean Tournament 2026',
    matchId: 162757,
  },
  {
    id: 3298,
    abbreviation: '6SC3',
    name: '6 Digit Switzerland Cup 3 (Higher Bracket)',
    matchId: 162659,
  },
  { id: 3297, abbreviation: 'MČSR2026', name: 'MČSR 2026', matchId: 162643 },
  {
    id: 3296,
    abbreviation: 'USC',
    name: 'USA States Cup 2026',
    matchId: 162582,
  },
  {
    id: 3295,
    abbreviation: 'RESC26',
    name: 'Resurrection Cup 2026',
    matchId: 162522,
  },
  {
    id: 3292,
    abbreviation: 'NACS',
    name: 'North American Continental Summit',
    matchId: 162362,
  },
];

const DAY = 86_400_000;

const daysAgo = (days: number) =>
  new Date(Date.now() - days * DAY).toISOString();

const asPlayer = (seed: SeedPlayer): PlayerStatsPlayer => ({
  id: seed.id,
  osuId: seed.osuId,
  username: seed.username,
  country: seed.country,
  rating: seed.rating,
});

const leaders = (pool: SeedPlayer[], from: number, top: number, step: number) =>
  pool.slice(from, from + 3).map((seed, index) => ({
    ...asPlayer(seed),
    value: top - index * step,
  }));

/** Distinct pairs in a stable order, so the dialog pages over real duos. */
const duos = (pool: SeedPlayer[], count: number): PlayerStatsDuo[] => {
  const rows: PlayerStatsDuo[] = [];

  for (let step = 1; step < pool.length && rows.length < count; step++) {
    for (let i = 0; i < pool.length && rows.length < count; i++) {
      const index = rows.length;
      rows.push({
        players: [asPlayer(pool[i]), asPlayer(pool[(i + step) % pool.length])],
        games: 420 - index * 4,
        matches: 90 - index,
        tournaments: 20 - (index % 15),
        firstGame: daysAgo(1800 - index * 12),
        lastGame: daysAgo(3 + (index % 40)),
      });
    }
  }

  return rows;
};

const upsets = (pool: SeedPlayer[], count: number, maxDays: number) =>
  Array.from({ length: count }, (_, index) => {
    const winner = pool[(index * 3 + 5) % pool.length];
    const loser = pool[(index * 3 + 6) % pool.length];
    const tournament = TOURNAMENTS[index % TOURNAMENTS.length];
    const winnerRating = 1250 + index * 7;
    const gap = 700 - index * 11;

    return {
      matchId: tournament.matchId,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        abbreviation: tournament.abbreviation,
      },
      date: daysAgo(
        Math.max(1, Math.round((maxDays * (index + 1)) / count) - 1)
      ),
      winner: { ...asPlayer(winner), ratingBefore: winnerRating },
      loser: { ...asPlayer(loser), ratingBefore: winnerRating + gap },
      gap,
    };
  });

const firstPlace = (pool: SeedPlayer[], count: number, offset: number) =>
  Array.from({ length: count }, (_, index) => {
    const seed = pool[(index + offset) % pool.length];
    const games = 52 + index * 9;
    const wins = Math.round(games * (0.72 - index * 0.02));

    return { ...asPlayer(seed), wins, games };
  });

const active = (pool: SeedPlayer[], count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...asPlayer(pool[(index + 2) % pool.length]),
    matches: 214 - index * 7,
    tournaments: 23 - index,
  }));

const MILESTONE_KINDS = ['tournaments', 'matches', 'games'] as const;
const MILESTONE_COUNTS = [100, 1000, 50, 250, 10, 500, 25, 100, 250] as const;

const milestones = (pool: SeedPlayer[], count: number) =>
  Array.from({ length: count }, (_, index) => ({
    ...asPlayer(pool[(index + 7) % pool.length]),
    kind: MILESTONE_KINDS[index % MILESTONE_KINDS.length],
    count: MILESTONE_COUNTS[index % MILESTONE_COUNTS.length],
    date: daysAgo(2 + index * 3),
    matchId: TOURNAMENTS[index % TOURNAMENTS.length].matchId,
  }));

const newcomers = (pool: SeedPlayer[], count: number) =>
  Array.from({ length: count }, (_, index) => {
    const seed = pool[(index + 11) % pool.length];
    // Rows 4 and 5 cover a player with no rating and one with no osu! rank yet
    const unrated = index === 3 || index >= count - 2;
    const unranked = index === 4 || index === count - 1;

    return {
      ...asPlayer(seed),
      rating: unrated ? null : 1690 - index * 130,
      firstMatch: daysAgo(1 + index * 3),
      matchId: TOURNAMENTS[index % TOURNAMENTS.length].matchId,
      wins: 5 - (index % 5),
      losses: index % 5,
      osuGlobalRank: unranked ? null : 4117 + index * 9137,
    };
  });

/** Every UTC month from 2015-01 to the current one. */
const participation = () => {
  const now = new Date();
  const rows: { month: string; players: number }[] = [];
  let index = 0;

  for (let year = 2015; year <= now.getUTCFullYear(); year++) {
    const lastMonth =
      year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12;

    for (let month = 1; month <= lastMonth; month++) {
      rows.push({
        month: `${year}-${String(month).padStart(2, '0')}`,
        players: 180 + index * 17 + (index % 12) * 40,
      });
      index++;
    }
  }

  return rows;
};

export const osuPlayerStats: PlayerStats = {
  leaders: {
    tournaments: leaders(OSU_PLAYERS, 0, 187, 23),
    matches: leaders(OSU_PLAYERS, 3, 1432, 114),
    games: leaders(OSU_PLAYERS, 6, 9871, 667),
  },
  mods: [
    { mods: Mods.Easy, leaders: leaders(OSU_PLAYERS, 9, 412, 37) },
    { mods: Mods.HardRock, leaders: leaders(OSU_PLAYERS, 12, 1988, 121) },
    { mods: Mods.Hidden, leaders: leaders(OSU_PLAYERS, 15, 2310, 284) },
    { mods: Mods.DoubleTime, leaders: leaders(OSU_PLAYERS, 18, 1742, 96) },
  ],
  duos: duos(OSU_PLAYERS, 64),
  upsets: {
    all: upsets(OSU_PLAYERS, 12, 1600),
    '3': upsets(OSU_PLAYERS.slice(4), 6, 88),
    '6': upsets(OSU_PLAYERS.slice(2), 7, 175),
    '12': upsets(OSU_PLAYERS.slice(1), 9, 360),
  },
  firstPlace: {
    all: firstPlace(OSU_PLAYERS, 12, 0),
    '1': firstPlace(OSU_PLAYERS, 8, 5),
    '2': firstPlace(OSU_PLAYERS, 8, 11),
    '3': firstPlace(OSU_PLAYERS, 7, 17),
    '4': firstPlace(OSU_PLAYERS, 6, 23),
  },
  active: active(OSU_PLAYERS, 10),
  milestones: milestones(OSU_PLAYERS, 9),
  newcomers: newcomers(OSU_PLAYERS, 9),
  participation: participation(),
};

const taikoLeaders = leaders(TAIKO_PLAYERS, 0, 96, 11);

export const taikoPlayerStats: PlayerStats = {
  leaders: {
    // The leader has no rating in this ruleset, so the row drops its tier line
    tournaments: taikoLeaders.map((leader, index) =>
      index === 0 ? { ...leader, rating: null } : leader
    ),
    matches: leaders(TAIKO_PLAYERS, 2, 604, 52),
    games: leaders(TAIKO_PLAYERS, 4, 3120, 210),
  },
  mods: [
    { mods: Mods.HardRock, leaders: leaders(TAIKO_PLAYERS, 1, 305, 24) },
    { mods: Mods.Hidden, leaders: leaders(TAIKO_PLAYERS, 3, 288, 19) },
    { mods: Mods.DoubleTime, leaders: leaders(TAIKO_PLAYERS, 0, 214, 16) },
  ],
  duos: duos(TAIKO_PLAYERS, 6),
  upsets: {
    all: upsets(TAIKO_PLAYERS, 4, 900),
    '3': [],
    '6': upsets(TAIKO_PLAYERS, 2, 170),
    '12': upsets(TAIKO_PLAYERS, 3, 350),
  },
  firstPlace: {
    all: firstPlace(TAIKO_PLAYERS, 5, 0),
    '1': firstPlace(TAIKO_PLAYERS, 4, 2),
    '2': firstPlace(TAIKO_PLAYERS, 3, 4),
    '3': [],
    '4': [],
  },
  active: active(TAIKO_PLAYERS, 6),
  milestones: milestones(TAIKO_PLAYERS, 4),
  newcomers: newcomers(TAIKO_PLAYERS, 4),
  participation: participation().slice(-36),
};

export const mania4kPlayerStats: PlayerStats = {
  leaders: {
    tournaments: leaders(MANIA4K_PLAYERS, 0, 74, 9),
    matches: leaders(MANIA4K_PLAYERS, 2, 512, 44),
    games: leaders(MANIA4K_PLAYERS, 4, 2604, 188),
  },
  mods: [],
  duos: duos(MANIA4K_PLAYERS, 7),
  upsets: {
    all: upsets(MANIA4K_PLAYERS, 5, 800),
    '3': upsets(MANIA4K_PLAYERS, 2, 80),
    '6': upsets(MANIA4K_PLAYERS, 3, 170),
    '12': upsets(MANIA4K_PLAYERS, 4, 350),
  },
  firstPlace: {
    all: firstPlace(MANIA4K_PLAYERS, 6, 0),
    '1': firstPlace(MANIA4K_PLAYERS, 4, 1),
    '2': firstPlace(MANIA4K_PLAYERS, 4, 3),
    '3': firstPlace(MANIA4K_PLAYERS, 3, 5),
    '4': [],
  },
  active: active(MANIA4K_PLAYERS, 7),
  milestones: milestones(MANIA4K_PLAYERS, 5),
  newcomers: newcomers(MANIA4K_PLAYERS, 5),
  participation: participation().slice(-48),
};

export const playerStatsFixtures = [
  { ruleset: Ruleset.Osu, stats: osuPlayerStats },
  { ruleset: Ruleset.Taiko, stats: taikoPlayerStats },
  { ruleset: Ruleset.Mania4k, stats: mania4kPlayerStats },
] as const;

const SOURCE_KEY = 'e2e-player-stats-fixture';

/**
 * Playwright runs outside Next.js, which is what normally loads the repository
 * root `.env`, so find it from the working directory.
 */
function databaseUrl(): string {
  for (
    let directory = process.cwd(), depth = 0;
    depth < 5;
    directory = dirname(directory), depth++
  ) {
    if (process.env.DATABASE_URL) {
      return process.env.DATABASE_URL;
    }

    const candidate = join(directory, '.env');
    if (existsSync(candidate)) {
      loadEnv({ path: candidate, quiet: true });
    }
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set and no .env file was found');
  }

  return process.env.DATABASE_URL;
}

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();

  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

/** Writes one snapshot per fixture ruleset, replacing any existing row. */
export async function seedPlayerStats(): Promise<void> {
  await withClient(async (client) => {
    for (const { ruleset, stats } of playerStatsFixtures) {
      await client.query(
        `insert into platform_player_stats (ruleset, generated_at, source_key, payload)
         values ($1, $2, $3, $4)
         on conflict (ruleset) do update
           set generated_at = excluded.generated_at,
               source_key = excluded.source_key,
               payload = excluded.payload`,
        [ruleset, new Date().toISOString(), SOURCE_KEY, JSON.stringify(stats)]
      );
    }
  });
}

export async function clearPlayerStats(): Promise<void> {
  await withClient(async (client) => {
    await client.query(
      'delete from platform_player_stats where ruleset = any($1::int[])',
      [playerStatsFixtures.map(({ ruleset }) => ruleset)]
    );
  });
}

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test';
import { call } from '@orpc/server';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu';
import type { PlayerStats } from '@otr/core/stats/player-stats';

import { getPlayerStats } from '../statsProcedures';

// Seeds and deletes rows; point it at a disposable database.
// The procedure reads through `@/lib/db`, so DATABASE_URL must name the same database.
const url = process.env.SEARCH_TEST_DATABASE_URL;

// mania 7K keeps the fixture away from the rulesets the page fixtures use
const RULESET = Ruleset.Mania7k;

const player = {
  id: 1,
  osuId: 2,
  username: 'snapshot',
  country: 'US',
  rating: 1500,
};

const stats: PlayerStats = {
  leaders: {
    tournaments: [{ ...player, value: 12 }],
    matches: [],
    games: [],
  },
  mods: [],
  duos: [],
  upsets: { all: [], '3': [], '6': [], '12': [] },
  firstPlace: { all: [], '1': [], '2': [], '3': [], '4': [] },
  active: [],
  milestones: [],
  newcomers: [],
  participation: [{ month: '2026-08', players: 3 }],
};

describe.skipIf(!url)('stats.players snapshot', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const context = { headers: new Headers() };

  const clear = async () => {
    await db
      .delete(schema.platformPlayerStats)
      .where(eq(schema.platformPlayerStats.ruleset, RULESET));
  };

  beforeAll(clear);
  afterEach(clear);

  afterAll(async () => {
    await pool.end();
  });

  it('reports no snapshot when the ruleset has no row', async () => {
    const result = await call(
      getPlayerStats,
      { ruleset: RULESET },
      { context }
    );

    expect(result).toEqual({
      ruleset: RULESET,
      generatedAt: null,
      stats: null,
    });
  });

  it('returns the stored snapshot for the requested ruleset', async () => {
    await db.insert(schema.platformPlayerStats).values({
      ruleset: RULESET,
      generatedAt: '2026-09-09T12:00:00.000Z',
      sourceKey: 'test',
      payload: stats,
    });

    const result = await call(
      getPlayerStats,
      { ruleset: RULESET },
      { context }
    );

    expect(result.ruleset).toBe(RULESET);
    expect(result.generatedAt).toBe('2026-09-09T12:00:00.000Z');
    expect(result.stats).toEqual(stats);
  });

  it('fails loudly when the stored payload does not match the contract', async () => {
    await db.insert(schema.platformPlayerStats).values({
      ruleset: RULESET,
      generatedAt: '2026-09-09T12:00:00.000Z',
      sourceKey: 'test',
      payload: { leaders: {} } as unknown as PlayerStats,
    });

    await expect(
      call(getPlayerStats, { ruleset: RULESET }, { context })
    ).rejects.toThrow();
  });

  it('rejects a ruleset without a snapshot', async () => {
    await expect(
      call(
        getPlayerStats,
        { ruleset: Ruleset.ManiaOther as never },
        { context }
      )
    ).rejects.toThrow();
  });
});

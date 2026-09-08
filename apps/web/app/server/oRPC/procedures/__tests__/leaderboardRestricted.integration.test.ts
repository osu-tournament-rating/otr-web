import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { call } from '@orpc/server';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu';
import { getLeaderboard } from '../leaderboardProcedures';
import { getPlayer } from '../playerProcedures';

// Seeds and deletes rows; point it at a disposable database.
// The procedures read through `@/lib/db`, so DATABASE_URL must name the same database.
const url = process.env.SEARCH_TEST_DATABASE_URL;

// osu! country codes are two letters, so this code isolates the fixture rows
const COUNTRY = 'X890';
const VISIBLE_OSU_ID = 999_890_001;
const RESTRICTED_OSU_ID = 999_890_002;
const osuIds = [VISIBLE_OSU_ID, RESTRICTED_OSU_ID];

describe.skipIf(!url)('leaderboard restricted players', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const context = { headers: new Headers() };
  let restrictedPlayerId = 0;

  beforeAll(async () => {
    const players = await db
      .insert(schema.players)
      .values([
        { osuId: VISIBLE_OSU_ID, username: 'visible890', country: COUNTRY },
        {
          osuId: RESTRICTED_OSU_ID,
          username: 'restricted890',
          country: COUNTRY,
          osuRestricted: true,
        },
      ])
      .returning({ id: schema.players.id, osuId: schema.players.osuId });

    restrictedPlayerId = players.find(
      (player) => player.osuId === RESTRICTED_OSU_ID
    )!.id;

    await db.insert(schema.playerRatings).values(
      players.map((player, index) => ({
        playerId: player.id,
        ruleset: Ruleset.Osu,
        rating: 3000 - index,
        volatility: 100,
        percentile: 0.99,
        globalRank: 999_890_001 + index,
        countryRank: index + 1,
      }))
    );
  });

  afterAll(async () => {
    const ids = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(inArray(schema.players.osuId, osuIds));
    const playerIds = ids.map((row) => row.id);

    await db
      .delete(schema.playerRatings)
      .where(inArray(schema.playerRatings.playerId, playerIds));
    await db
      .delete(schema.players)
      .where(inArray(schema.players.id, playerIds));
    await pool.end();
  });

  it('omits restricted players from the leaderboard', async () => {
    const result = await call(
      getLeaderboard,
      { ruleset: Ruleset.Osu, country: COUNTRY },
      { context }
    );

    expect(result.leaderboard.map((row) => row.player.osuId)).toEqual([
      VISIBLE_OSU_ID,
    ]);
    expect(result.total).toBe(1);
  });

  it('keeps a restricted player reachable and exposes the flag', async () => {
    const player = await call(
      getPlayer,
      { id: restrictedPlayerId, keyType: 'otr' },
      { context }
    );

    expect(player.osuRestricted).toBe(true);
  });
});

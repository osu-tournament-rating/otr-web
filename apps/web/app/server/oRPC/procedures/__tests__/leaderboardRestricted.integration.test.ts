import { afterAll, beforeAll, describe, expect, it, spyOn } from 'bun:test';
import { call } from '@orpc/server';
import { inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu';
import { auth } from '@/lib/auth/auth';
import {
  getLeaderboard,
  getLeaderboardFriends,
} from '../leaderboardProcedures';
import { getPlayer, getPlayerStats } from '../playerProcedures';

// Seeds and deletes rows; point it at a disposable database.
// The procedures read through `@/lib/db`, so DATABASE_URL must name the same database.
const url = process.env.SEARCH_TEST_DATABASE_URL;

// osu! country codes are two letters, so this code isolates the fixture rows
const COUNTRY = 'X890';
const VISIBLE_OSU_ID = 999_890_001;
const RESTRICTED_OSU_ID = 999_890_002;
const OTHER_VISIBLE_OSU_ID = 999_890_003;
const osuIds = [VISIBLE_OSU_ID, RESTRICTED_OSU_ID, OTHER_VISIBLE_OSU_ID];
const rulesets = [
  Ruleset.Osu,
  Ruleset.Taiko,
  Ruleset.Catch,
  Ruleset.ManiaOther,
  Ruleset.Mania4k,
  Ruleset.Mania7k,
];

describe.skipIf(!url)('leaderboard restricted players', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  const context = { headers: new Headers() };
  let restrictedPlayerId = 0;
  let visiblePlayerId = 0;
  let otherVisiblePlayerId = 0;

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
        { osuId: OTHER_VISIBLE_OSU_ID, username: 'other890', country: COUNTRY },
      ])
      .returning({ id: schema.players.id, osuId: schema.players.osuId });

    restrictedPlayerId = players.find(
      (player) => player.osuId === RESTRICTED_OSU_ID
    )!.id;

    visiblePlayerId = players.find(
      (player) => player.osuId === VISIBLE_OSU_ID
    )!.id;
    otherVisiblePlayerId = players.find(
      (player) => player.osuId === OTHER_VISIBLE_OSU_ID
    )!.id;
    await db.insert(schema.playerFriends).values([
      { playerId: visiblePlayerId, friendId: restrictedPlayerId },
      { playerId: restrictedPlayerId, friendId: otherVisiblePlayerId },
    ]);

    await db.insert(schema.playerRatings).values(
      rulesets.flatMap((ruleset) =>
        players.map((player, index) => ({
          playerId: player.id,
          ruleset,
          rating: 3000 - index,
          volatility: 100,
          percentile: 0.99,
          globalRank: 999_890_001 + index,
          countryRank: index + 1,
        }))
      )
    );
  });

  afterAll(async () => {
    const ids = await db
      .select({ id: schema.players.id })
      .from(schema.players)
      .where(inArray(schema.players.osuId, osuIds));
    const playerIds = ids.map((row) => row.id);

    await db
      .delete(schema.playerFriends)
      .where(inArray(schema.playerFriends.playerId, playerIds));
    await db
      .delete(schema.playerRatings)
      .where(inArray(schema.playerRatings.playerId, playerIds));
    await db
      .delete(schema.players)
      .where(inArray(schema.players.id, playerIds));
    await pool.end();
  });

  it.each(rulesets)(
    'omits restricted players for ruleset %i',
    async (ruleset) => {
      const result = await call(
        getLeaderboard,
        { ruleset, country: COUNTRY },
        { context }
      );

      expect(result.leaderboard.map((row) => row.player.osuId)).toEqual([
        VISIBLE_OSU_ID,
        OTHER_VISIBLE_OSU_ID,
      ]);
      expect(result.total).toBe(2);
    }
  );

  it('paginates visible players while preserving stored rank gaps', async () => {
    for (const [index, osuId] of [
      VISIBLE_OSU_ID,
      OTHER_VISIBLE_OSU_ID,
    ].entries()) {
      const result = await call(
        getLeaderboard,
        {
          ruleset: Ruleset.Osu,
          country: COUNTRY,
          page: index + 1,
          pageSize: 1,
        },
        { context }
      );

      expect(result.total).toBe(2);
      expect(result.pages).toBe(2);
      expect(result.leaderboard.map((row) => row.player.osuId)).toEqual([
        osuId,
      ]);
      expect(result.leaderboard[0].globalRank).toBe(999_890_001 + index * 2);
      expect(result.leaderboard[0].countryRank).toBe(1 + index * 2);
    }
  });

  it.each([false, true])(
    'excludes restricted friends and self (restricted viewer: %s)',
    async (restrictedViewer) => {
      const session = {
        dbPlayer: {
          id: restrictedViewer ? restrictedPlayerId : visiblePlayerId,
        },
      };
      const getSession = spyOn(auth.api, 'getSession').mockResolvedValue(
        session as Awaited<ReturnType<typeof auth.api.getSession>>
      );
      try {
        const result = await call(
          getLeaderboardFriends,
          { ruleset: Ruleset.Osu },
          { context }
        );
        expect(result.leaderboard.map((row) => row.player.osuId)).toEqual([
          restrictedViewer ? OTHER_VISIBLE_OSU_ID : VISIBLE_OSU_ID,
        ]);
        expect(result.total).toBe(1);
      } finally {
        getSession.mockRestore();
      }
    }
  );

  it('exposes restriction on profile stats and the nested rating player', async () => {
    const stats = await call(
      getPlayerStats,
      {
        id: restrictedPlayerId,
        keyType: 'otr',
        ruleset: Ruleset.Osu,
      },
      { context }
    );
    expect(stats.playerInfo.osuRestricted).toBe(true);
    expect(stats.rating?.player.osuRestricted).toBe(true);
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

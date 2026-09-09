import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { call } from '@orpc/server';
import { eq, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu';
import { getTournament } from '../tournamentsProcedures';

// Seeds and deletes rows; DATABASE_URL must point to this disposable database too.
const url = process.env.SEARCH_TEST_DATABASE_URL;
const VISIBLE_OSU_ID = 999_909_001;
const RESTRICTED_OSU_ID = 999_909_002;

describe.skipIf(!url)('tournament player restriction contract', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  let tournamentId = 0;
  let beatmapsetId = 0;

  beforeAll(async () => {
    const players = await db
      .insert(schema.players)
      .values([
        { osuId: VISIBLE_OSU_ID, username: 'visible909', country: 'US' },
        {
          osuId: RESTRICTED_OSU_ID,
          username: 'restricted909',
          country: 'US',
          osuRestricted: true,
        },
      ])
      .returning({ id: schema.players.id, osuId: schema.players.osuId });
    const restrictedPlayerId = players.find(
      (player) => player.osuId === RESTRICTED_OSU_ID
    )!.id;
    const [tournament] = await db
      .insert(schema.tournaments)
      .values({
        name: 'Restriction contract 909',
        abbreviation: 'RC909',
        forumUrl: 'https://osu.ppy.sh/community/forums/topics/999909',
        rankRangeLowerBound: 1,
        ruleset: Ruleset.Osu,
        lobbySize: 2,
      })
      .returning({ id: schema.tournaments.id });
    tournamentId = tournament.id;
    const [beatmapset] = await db
      .insert(schema.beatmapsets)
      .values({
        osuId: 999_909_001,
        creatorId: restrictedPlayerId,
        artist: 'Fixture artist',
        title: 'Fixture song',
        rankedStatus: 1,
      })
      .returning({ id: schema.beatmapsets.id });
    beatmapsetId = beatmapset.id;
    const [beatmap] = await db
      .insert(schema.beatmaps)
      .values({
        osuId: 999_909_001,
        beatmapsetId,
        ruleset: Ruleset.Osu,
        rankedStatus: 1,
        diffName: 'Fixture difficulty',
        totalLength: 120,
        drainLength: 100,
        bpm: 180,
        countCircle: 100,
        countSlider: 50,
        countSpinner: 1,
        cs: 4,
        hp: 5,
        od: 8,
        ar: 9,
        sr: 5,
      })
      .returning({ id: schema.beatmaps.id });
    await db.insert(schema.joinPooledBeatmaps).values({
      tournamentsPooledInId: tournamentId,
      pooledBeatmapsId: beatmap.id,
    });
    await db.insert(schema.joinBeatmapCreators).values(
      players.map((player) => ({
        createdBeatmapsId: beatmap.id,
        creatorsId: player.id,
      }))
    );
    await db.insert(schema.playerTournamentStats).values(
      players.map((player) => ({
        playerId: player.id,
        tournamentId,
        averageRatingDelta: 0,
        averageMatchCost: 1,
        averageScore: 100000,
        averagePlacement: 1,
        averageAccuracy: 0.95,
        matchesPlayed: 1,
        matchesWon: 1,
        matchesLost: 0,
        gamesPlayed: 1,
        gamesWon: 1,
        gamesLost: 0,
        teammateIds: [],
      }))
    );
  });

  afterAll(async () => {
    await db
      .delete(schema.tournaments)
      .where(eq(schema.tournaments.id, tournamentId));
    await db
      .delete(schema.beatmapsets)
      .where(eq(schema.beatmapsets.id, beatmapsetId));
    await db
      .delete(schema.players)
      .where(
        inArray(schema.players.osuId, [VISIBLE_OSU_ID, RESTRICTED_OSU_ID])
      );
    await pool.end();
  });

  it('returns restriction status on participants, set owners, and difficulty creators', async () => {
    const tournament = await call(
      getTournament,
      { id: tournamentId },
      {
        context: { headers: new Headers() },
      }
    );
    const expected = new Map([
      [VISIBLE_OSU_ID, false],
      [RESTRICTED_OSU_ID, true],
    ]);

    expect(
      new Map(
        tournament.playerTournamentStats.map(({ player }) => [
          player.osuId,
          player.osuRestricted,
        ])
      )
    ).toEqual(expected);
    expect(tournament.pooledBeatmaps).toHaveLength(1);
    const beatmap = tournament.pooledBeatmaps[0];
    expect(beatmap.beatmapset?.creator?.osuRestricted).toBe(true);
    expect(
      new Map(
        beatmap.creators.map((player) => [player.osuId, player.osuRestricted])
      )
    ).toEqual(expected);
  });
});

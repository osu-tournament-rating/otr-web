import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu';
import {
  buildBeatmapSearchExpressions,
  buildTrigramPrecision,
  parseSearchTerm,
} from '../search';

// Point at a disposable database
const url = process.env.SEARCH_TEST_DATABASE_URL;

const OSU_ID = 999_100_001;
const OVERRIDDEN_BEATMAP_OSU_ID = 999_100_002;
const DELETED_BEATMAP_OSU_ID = 999_100_003;

describe.skipIf(!url)('player search over the migrated schema', () => {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });

  afterAll(async () => {
    await db.delete(schema.players).where(eq(schema.players.osuId, OSU_ID));
    await pool.end();
  });

  it('finds a seeded player by full-text and trigram match', async () => {
    await db
      .insert(schema.players)
      .values({ osuId: OSU_ID, username: 'hotdog2000' });

    const parsed = parseSearchTerm('hotdog2000')!;

    const rows = await db
      .select({ username: schema.players.username })
      .from(schema.players)
      .where(
        and(
          eq(schema.players.osuId, OSU_ID),
          sql`${schema.players.searchVector} @@ ${parsed.tsQuery}`,
          buildTrigramPrecision([schema.players.username], parsed)
        )
      );

    expect(rows).toEqual([{ username: 'hotdog2000' }]);
  });
});

describe.skipIf(!url)(
  'overridden beatmap search over the migrated schema',
  () => {
    const pool = new Pool({ connectionString: url });
    const db = drizzle(pool, { schema });

    const seeded = [OVERRIDDEN_BEATMAP_OSU_ID, DELETED_BEATMAP_OSU_ID];

    const beatmap = (osuId: number, overridden: boolean) => ({
      osuId,
      ruleset: Ruleset.Osu,
      rankedStatus: 1,
      diffName: 'Yomogi',
      totalLength: 222,
      drainLength: 200,
      bpm: 180,
      countCircle: 100,
      countSlider: 50,
      countSpinner: 1,
      cs: 4,
      hp: 5,
      od: 8,
      ar: 9,
      sr: 5.5,
      dataFetchStatus: DataFetchStatus.NotFound,
      manualOverride: overridden,
      titleOverride: overridden ? 'Sasayaka na Kanashimi' : null,
      artistOverride: overridden ? 'Kamiyama Yoko' : null,
    });

    const remove = () =>
      db.delete(schema.beatmaps).where(inArray(schema.beatmaps.osuId, seeded));

    beforeAll(async () => {
      await remove();
      await db
        .insert(schema.beatmaps)
        .values([
          beatmap(OVERRIDDEN_BEATMAP_OSU_ID, true),
          beatmap(DELETED_BEATMAP_OSU_ID, false),
        ]);
    });

    afterAll(async () => {
      await remove();
      await pool.end();
    });

    // Mirrors the select in searchProcedures and the beatmap list.
    const search = async (term: string) => {
      const expressions = buildBeatmapSearchExpressions(term)!;

      return db
        .select({
          osuId: schema.beatmaps.osuId,
          artist: sql<
            string | null
          >`coalesce(${schema.beatmaps.artistOverride}, ${schema.beatmapsets.artist})`.as(
            'artist'
          ),
          title: sql<
            string | null
          >`coalesce(${schema.beatmaps.titleOverride}, ${schema.beatmapsets.title})`.as(
            'title'
          ),
        })
        .from(schema.beatmaps)
        .leftJoin(
          schema.beatmapsets,
          eq(schema.beatmaps.beatmapsetId, schema.beatmapsets.id)
        )
        .leftJoin(
          schema.beatmapStats,
          eq(schema.beatmapStats.beatmapId, schema.beatmaps.id)
        )
        .where(
          and(inArray(schema.beatmaps.osuId, seeded), expressions.condition)
        )
        .orderBy(expressions.rank);
    };

    const matches = async (term: string) =>
      (await search(term)).map(({ osuId }) => osuId);

    it('finds a hand-repaired beatmap by its overridden title and artist', async () => {
      expect(await matches('sasayaka')).toEqual([OVERRIDDEN_BEATMAP_OSU_ID]);
      expect(await matches('kamiyama yoko')).toEqual([
        OVERRIDDEN_BEATMAP_OSU_ID,
      ]);
    });

    it('leaves a deleted beatmap nobody repaired out of the results', async () => {
      expect(await matches('yomogi')).toEqual([OVERRIDDEN_BEATMAP_OSU_ID]);
    });

    it('carries the overridden artist and title into the result, not a set it has none of', async () => {
      expect(await search('sasayaka')).toEqual([
        {
          osuId: OVERRIDDEN_BEATMAP_OSU_ID,
          artist: 'Kamiyama Yoko',
          title: 'Sasayaka na Kanashimi',
        },
      ]);
    });

    it('keeps the search vector index across the generated-column rebuild', async () => {
      const { rows } = await db.execute<{ indexdef: string }>(
        sql`SELECT indexdef FROM pg_indexes WHERE tablename = 'beatmaps' AND indexname = 'ix_beatmaps_search_vector'`
      );

      expect(rows[0]?.indexdef).toContain('USING gin');
    });
  }
);

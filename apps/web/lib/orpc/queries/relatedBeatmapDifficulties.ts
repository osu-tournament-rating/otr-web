import { and, asc, eq, ne, sql } from 'drizzle-orm';

import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import * as schema from '@otr/core/db/schema';
import type { DatabaseClient } from '@/lib/db';
import {
  RelatedBeatmapDifficultySchema,
  type RelatedBeatmapDifficulty,
} from '@/lib/orpc/schema/beatmapStats';

export async function getRelatedBeatmapDifficulties(
  db: DatabaseClient,
  beatmapsetId: number | null
): Promise<RelatedBeatmapDifficulty[]> {
  if (!beatmapsetId) return [];

  const rows = await db
    .select({
      osuId: schema.beatmaps.osuId,
      diffName: schema.beatmaps.diffName,
      ruleset: schema.beatmaps.ruleset,
      sr: schema.beatmaps.sr,
      // Pool membership, unfiltered by verification, so the tooltip agrees
      // with the "Pooled in" tile and the rank-range donut on the difficulty's
      // own page. beatmap_stats only carries the verified subset.
      pooledTournamentCount: sql<number>`(
        SELECT COUNT(DISTINCT ${schema.joinPooledBeatmaps.tournamentsPooledInId})::int
        FROM ${schema.joinPooledBeatmaps}
        WHERE ${schema.joinPooledBeatmaps.pooledBeatmapsId} = ${schema.beatmaps.id}
      )`.as('pooled_tournament_count'),
      verifiedGameCount:
        sql<number>`COALESCE(${schema.beatmapStats.verifiedGameCount}, 0)`.as(
          'verified_game_count'
        ),
    })
    .from(schema.beatmaps)
    .leftJoin(
      schema.beatmapStats,
      eq(schema.beatmaps.id, schema.beatmapStats.beatmapId)
    )
    .where(
      and(
        eq(schema.beatmaps.beatmapsetId, beatmapsetId),
        ne(schema.beatmaps.dataFetchStatus, DataFetchStatus.NotFound)
      )
    )
    .orderBy(asc(schema.beatmaps.sr), asc(schema.beatmaps.osuId));

  return RelatedBeatmapDifficultySchema.array().parse(rows);
}

import { and, asc, eq, ne } from 'drizzle-orm';

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
    })
    .from(schema.beatmaps)
    .where(
      and(
        eq(schema.beatmaps.beatmapsetId, beatmapsetId),
        ne(schema.beatmaps.dataFetchStatus, DataFetchStatus.NotFound)
      )
    )
    .orderBy(asc(schema.beatmaps.sr), asc(schema.beatmaps.osuId));

  return RelatedBeatmapDifficultySchema.array().parse(rows);
}

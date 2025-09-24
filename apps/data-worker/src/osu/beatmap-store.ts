import { eq } from 'drizzle-orm';

import type { DatabaseClient } from '../db';
import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu/enums';

type QueryExecutor = Pick<DatabaseClient, 'query' | 'insert' | 'update'>;
type UpdateExecutor = Pick<DatabaseClient, 'update'>;

export interface BeatmapRecord {
  id: number;
  dataFetchStatus: number;
}

export const ensureBeatmapPlaceholder = async (
  db: QueryExecutor,
  osuBeatmapId: number,
  status: number,
  updatedIso: string
): Promise<BeatmapRecord> => {
  const existing = await db.query.beatmaps.findFirst({
    where: eq(schema.beatmaps.osuId, osuBeatmapId),
    columns: {
      id: true,
      dataFetchStatus: true,
    },
  });

  if (existing) {
    return existing;
  }

  const [inserted] = await db
    .insert(schema.beatmaps)
    .values({
      osuId: osuBeatmapId,
      ruleset: Ruleset.Osu,
      rankedStatus: 0,
      diffName: 'Pending fetch',
      totalLength: 0,
      drainLength: 0,
      bpm: 0,
      countCircle: 0,
      countSlider: 0,
      countSpinner: 0,
      cs: 0,
      hp: 0,
      od: 0,
      ar: 0,
      sr: 0,
      maxCombo: null,
      beatmapsetId: null,
      dataFetchStatus: status,
      updated: updatedIso,
    })
    .onConflictDoNothing()
    .returning({
      id: schema.beatmaps.id,
      dataFetchStatus: schema.beatmaps.dataFetchStatus,
    });

  if (inserted) {
    return inserted;
  }

  const fallback = await db.query.beatmaps.findFirst({
    where: eq(schema.beatmaps.osuId, osuBeatmapId),
    columns: {
      id: true,
      dataFetchStatus: true,
    },
  });

  if (!fallback) {
    throw new Error('Failed to upsert beatmap placeholder');
  }

  return fallback;
};

export const updateBeatmapStatus = async (
  db: UpdateExecutor,
  beatmapId: number,
  status: number,
  updatedIso: string
) => {
  await db
    .update(schema.beatmaps)
    .set({
      dataFetchStatus: status,
      updated: updatedIso,
    })
    .where(eq(schema.beatmaps.id, beatmapId));
};

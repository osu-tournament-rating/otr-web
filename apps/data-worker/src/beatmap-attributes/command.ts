import { eq } from 'drizzle-orm';
import { beatmaps } from '@otr/core/db/schema';
import {
  getDefaultCalculationSettings,
  normalizeCalculationRequests,
} from '@otr/core/osu/beatmap-attributes';
import type { DatabaseClient } from '../db';
import { ensureBeatmapPlaceholder } from '../osu/beatmap-store';

export interface AttributeCommandInput {
  osuId: number;
  ruleset?: number;
  mods?: number[];
  clockRate?: number;
  lazer: boolean;
  create: boolean;
}

export async function prepareAttributeCommand(
  db: DatabaseClient,
  input: AttributeCommandInput
) {
  if (!Number.isSafeInteger(input.osuId) || input.osuId < 1)
    throw new Error('--osu-id must be a positive beatmap ID');
  const normalize = (ruleset: number) =>
    normalizeCalculationRequests(
      (
        input.mods ?? getDefaultCalculationSettings(ruleset).map((s) => s.mods)
      ).map((mods) => ({
        ruleset,
        mods,
        clockRate: input.clockRate,
        lazer: input.lazer,
      }))
    );
  normalize(input.ruleset ?? 0);
  let beatmap = await db.query.beatmaps.findFirst({
    where: eq(beatmaps.osuId, input.osuId),
  });
  const settings = normalize(input.ruleset ?? beatmap?.ruleset ?? 0);
  if (!beatmap) {
    if (!input.create) throw new Error('Beatmap does not exist');
    const row = await ensureBeatmapPlaceholder(
      db,
      input.osuId,
      0,
      new Date().toISOString(),
      settings[0].ruleset
    );
    beatmap = await db.query.beatmaps.findFirst({
      where: eq(beatmaps.id, row.id),
    });
  }
  if (!beatmap) throw new Error('Unable to load beatmap');
  return { beatmap, settings: normalize(input.ruleset ?? beatmap.ruleset) };
}

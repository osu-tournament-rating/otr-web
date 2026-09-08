import { parseArgs } from 'node:util';
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
        lazer: false,
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

export function parseAttributeArguments(args: string[]) {
  const parsed = parseArgs({
    args,
    options: {
      'osu-id': { type: 'string' },
      ruleset: { type: 'string' },
      mods: { type: 'string' },
      'batch-size': { type: 'string' },
      'after-id': { type: 'string' },
      recalculate: { type: 'boolean' },
      'refresh-source': { type: 'boolean' },
      inspect: { type: 'boolean' },
    },
    strict: true,
    allowPositionals: false,
  });
  const { values } = parsed;
  if (values['batch-size'] !== undefined) {
    const size = Number(values['batch-size']);
    const afterId = Number(values['after-id'] ?? 0);
    if (!Number.isInteger(size) || size < 1 || size > 100)
      throw new Error('--batch-size must be an integer from 1 through 100');
    if (!Number.isSafeInteger(afterId) || afterId < 0)
      throw new Error('--after-id must be a nonnegative database beatmap ID');
    if (
      values['osu-id'] !== undefined ||
      values.ruleset !== undefined ||
      values.mods !== undefined ||
      values.inspect
    )
      throw new Error(
        'Batch scheduling uses fetched beatmaps and their default profiles'
      );
  } else {
    const osuId = Number(values['osu-id']);
    if (!Number.isSafeInteger(osuId) || osuId < 1)
      throw new Error('--osu-id must be a positive beatmap ID');
    if (values['after-id'] !== undefined)
      throw new Error('--after-id requires --batch-size');
    if (values.inspect && (values.recalculate || values['refresh-source']))
      throw new Error('--inspect cannot schedule work');
    if (
      values.mods !== undefined &&
      values.mods.split(',').some((value) => !/^\d+$/.test(value))
    )
      throw new Error('--mods must be comma-separated integer bitmasks');
  }
  return parsed;
}

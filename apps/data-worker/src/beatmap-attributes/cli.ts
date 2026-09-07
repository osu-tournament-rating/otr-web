import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import { ensureBeatmapPlaceholder } from '../osu/beatmap-store';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { beatmaps } from '@otr/core/db/schema';
import {
  normalizeCalculationRequests,
  getDefaultCalculationSettings,
} from '@otr/core/osu/beatmap-attributes';
import { createAttributesRuntime } from './runtime';
import { getBeatmapAttribute, scheduleBeatmapAttributes } from './service';

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    'osu-id': { type: 'string' },
    ruleset: { type: 'string' },
    mods: { type: 'string' },
    'clock-rate': { type: 'string' },
    lazer: { type: 'boolean', default: false },
    recalculate: { type: 'boolean' },
    'refresh-source': { type: 'boolean' },
    inspect: { type: 'boolean' },
  },
  strict: true,
});
const osuId = Number(values['osu-id']);
if (!Number.isSafeInteger(osuId) || osuId < 1)
  throw new Error('--osu-id must be a positive beatmap ID');
const runtime = await createAttributesRuntime();
try {
  let beatmap = await runtime.db.query.beatmaps.findFirst({
    where: eq(beatmaps.osuId, osuId),
  });
  if (!beatmap) {
    const ruleset = Number(values.ruleset ?? 0);
    const placeholder = await ensureBeatmapPlaceholder(
      runtime.db,
      osuId,
      DataFetchStatus.NotFetched,
      new Date().toISOString()
    );
    await runtime.db
      .update(beatmaps)
      .set({ ruleset })
      .where(eq(beatmaps.id, placeholder.id));
    beatmap = await runtime.db.query.beatmaps.findFirst({
      where: eq(beatmaps.osuId, osuId),
    });
  }
  if (!beatmap) throw new Error('Unable to load beatmap');
  const ruleset = Number(values.ruleset ?? beatmap.ruleset);
  const requests = values.mods
    ? values.mods.split(',').map((mods) => ({
        ruleset,
        mods: Number(mods),
        lazer: values.lazer,
        clockRate: values['clock-rate']
          ? Number(values['clock-rate'])
          : undefined,
      }))
    : getDefaultCalculationSettings(ruleset, values.lazer).map((setting) => ({
        ...setting,
        clockRate: values['clock-rate']
          ? Number(values['clock-rate'])
          : setting.clockRate,
      }));
  const settings = normalizeCalculationRequests(requests);
  if (values.inspect) {
    const row = await runtime.db.query.beatmaps.findFirst({
      where: eq(beatmaps.id, beatmap.id),
      with: {
        beatmapFiles: true,
        beatmapAttributes: true,
        beatmapAttributeJobs: true,
      },
    });
    const resolved = await Promise.all(
      settings.map((setting) =>
        getBeatmapAttribute(runtime.db, beatmap!.id, setting)
      )
    );
    console.log(JSON.stringify({ beatmap: row, resolved }, null, 2));
  } else {
    const job = await scheduleBeatmapAttributes(runtime.db, beatmap.id, {
      settings,
      recalculate: values.recalculate,
      refreshSource: values['refresh-source'],
    });
    await runtime.service.reconcile(
      (payload) => runtime.publisher.publish(payload),
      false
    );
    console.log(
      JSON.stringify(
        {
          beatmapId: beatmap.id,
          osuId,
          jobId: job?.id,
          generation: job?.generation,
          status: job?.status,
          profiles: settings,
        },
        null,
        2
      )
    );
  }
} finally {
  await runtime.close();
}

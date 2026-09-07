import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import { beatmaps } from '@otr/core/db/schema';
import { prepareAttributeCommand } from './command';
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
  const { beatmap, settings } = await prepareAttributeCommand(runtime.db, {
    osuId,
    ruleset: values.ruleset === undefined ? undefined : Number(values.ruleset),
    mods:
      values.mods === undefined
        ? undefined
        : values.mods.split(',').map(Number),
    clockRate:
      values['clock-rate'] === undefined
        ? undefined
        : Number(values['clock-rate']),
    lazer: values.lazer,
    create: !values.inspect,
  });
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

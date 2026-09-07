import { and, asc, eq, gt } from 'drizzle-orm';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { beatmaps } from '@otr/core/db/schema';
import { parseAttributeArguments, prepareAttributeCommand } from './command';
import { createAttributesRuntime } from './runtime';
import { getBeatmapAttribute, scheduleBeatmapAttributes } from './service';

const { values } = parseAttributeArguments(Bun.argv.slice(2));
const runtime = await createAttributesRuntime();
try {
  if (values['batch-size'] !== undefined) {
    const candidates = await runtime.db.query.beatmaps.findMany({
      where: and(
        eq(beatmaps.dataFetchStatus, DataFetchStatus.Fetched),
        gt(beatmaps.id, Number(values['after-id'] ?? 0))
      ),
      orderBy: asc(beatmaps.id),
      limit: Number(values['batch-size']),
      columns: { id: true },
    });
    for (const beatmap of candidates) {
      await scheduleBeatmapAttributes(runtime.db, beatmap.id, {
        recalculate: values.recalculate,
        refreshSource: values['refresh-source'],
      });
    }
    await runtime.service.reconcile((payload) =>
      runtime.publisher.publish(payload)
    );
    console.log(
      JSON.stringify({
        scheduled: candidates.length,
        nextAfterId: candidates.at(-1)?.id ?? null,
      })
    );
  } else {
    const osuId = Number(values['osu-id']);
    const { beatmap, settings } = await prepareAttributeCommand(runtime.db, {
      osuId,
      ruleset:
        values.ruleset === undefined ? undefined : Number(values.ruleset),
      mods:
        values.mods === undefined
          ? undefined
          : values.mods.split(',').map(Number),
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
      await runtime.service.reconcile((payload) =>
        runtime.publisher.publish(payload)
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
  }
} finally {
  await runtime.close();
}

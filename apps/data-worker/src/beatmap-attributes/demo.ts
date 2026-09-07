import { eq } from 'drizzle-orm';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { beatmaps, beatmapAttributeJobs as jobs } from '@otr/core/db/schema';
import { ensureBeatmapPlaceholder } from '../osu/beatmap-store';
import { createAttributesRuntime } from './runtime';
import { scheduleBeatmapAttributes, getBeatmapAttribute } from './service';
import { getDefaultCalculationSettings } from '@otr/core/osu/beatmap-attributes';

const runtime = await createAttributesRuntime();
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
assert(
  new URL(process.env.DATABASE_URL!).port === '5434',
  'Demo requires the disposable database on port 5434'
);
assert(runtime.storage.provider === 'local', 'Demo requires local storage');
assert(
  process.env.BEATMAP_ATTRIBUTES_DISCOVER === 'false',
  'Demo requires discovery disabled on the separate worker'
);
const samples = [
  { osuId: 2785319, ruleset: 0 },
  { osuId: 1028484, ruleset: 1 },
  { osuId: 2118524, ruleset: 2 },
  { osuId: 1638954, ruleset: 4 },
  { osuId: 763919, ruleset: 5 },
];
const waitFor = async (id: number) => {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const job = await runtime.db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.beatmapId, id),
    });
    if (job?.status === 'complete') return job;
    if (job?.status === 'failed')
      throw new Error(`Job failed: ${job.errorCode}`);
    await Bun.sleep(250);
  }
  throw new Error(
    'Timed out: run attributes:worker against the same database and broker'
  );
};
try {
  const ids: number[] = [];
  for (const sample of samples) {
    const row = await ensureBeatmapPlaceholder(
      runtime.db,
      sample.osuId,
      0,
      new Date().toISOString()
    );
    ids.push(row.id);
    await scheduleBeatmapAttributes(runtime.db, row.id, {
      settings: getDefaultCalculationSettings(sample.ruleset),
      recalculate: true,
    });
  }
  await runtime.service.reconcile(
    (payload) => runtime.publisher.publish(payload),
    false
  );
  await Promise.all(ids.map(waitFor));
  const summary = [];
  for (const id of ids) {
    const row = await runtime.db.query.beatmaps.findFirst({
      where: eq(beatmaps.id, id),
      with: { beatmapFiles: true, beatmapAttributes: { with: { file: true } } },
    });
    assert(
      row?.beatmapFiles.length === 1,
      'Expected one shared source per sample'
    );
    assert(
      row?.beatmapAttributes.length === 6,
      'Expected six persisted profile results'
    );
    summary.push({
      osuId: row!.osuId,
      source: row!.beatmapFiles[0],
      profiles: row!.beatmapAttributes.map((a) => ({
        id: a.id,
        ruleset: a.ruleset,
        mods: a.mods,
        sr: a.sr,
        ar: a.ar,
        od: a.od,
        cs: a.cs,
        hpDrain: a.hpDrain,
        bpm: a.bpm,
        maxCombo: a.maxCombo,
        clockRate: a.clockRate,
        totalLength: a.totalLength,
        drainLength: a.drainLength,
        version: a.calculatorVersion,
        formatVersion: a.formatVersion,
        sourceMatches: a.file.checksum === a.checksum,
      })),
    });
  }
  const aliasInputs = [64, 512, 576].map((mods) => ({
    ruleset: 0,
    mods,
    lazer: false,
  }));
  const aliasJob = await scheduleBeatmapAttributes(runtime.db, ids[0], {
    settings: aliasInputs,
  });
  await runtime.publisher.publish({
    jobId: aliasJob!.id,
    generation: aliasJob!.generation,
  });
  await runtime.publisher.publish({
    jobId: aliasJob!.id,
    generation: aliasJob!.generation,
  });
  const aliases = await Promise.all(
    aliasInputs.map((input) => getBeatmapAttribute(runtime.db, ids[0], input))
  );
  assert(
    new Set(aliases.map((a) => a?.id)).size === 1 &&
      aliases[0]?.clockRate === 1.5,
    'NC aliases must resolve to the same DT result'
  );
  for (let i = 0; i < ids.length; i++)
    await scheduleBeatmapAttributes(runtime.db, ids[i], {
      settings: getDefaultCalculationSettings(samples[i].ruleset),
      recalculate: true,
    });
  await runtime.service.reconcile(
    (payload) => runtime.publisher.publish(payload),
    false
  );
  await Promise.all(ids.map(waitFor));
  for (let i = 0; i < ids.length; i++) {
    const repeated = await runtime.db.query.beatmaps.findFirst({
      where: eq(beatmaps.id, ids[i]),
      with: { beatmapAttributes: true },
    });
    assert(
      JSON.stringify(repeated!.beatmapAttributes.map((a) => a.id).sort()) ===
        JSON.stringify(summary[i].profiles.map((a) => a.id).sort()),
      'Repeated processing changed result IDs'
    );
  }
  await rm(join(runtime.config.directory!, summary[0].source.storageKey));
  await scheduleBeatmapAttributes(runtime.db, ids[0], {
    settings: getDefaultCalculationSettings(0),
    recalculate: true,
  });
  await runtime.service.reconcile(
    (payload) => runtime.publisher.publish(payload),
    false
  );
  await waitFor(ids[0]);
  assert(
    await runtime.storage.get(summary[0].source.storageKey),
    'Missing local source was not reacquired'
  );
  console.log(
    JSON.stringify(
      {
        summary,
        aliasResultIds: aliases.map((a) => a!.id),
        idempotent: true,
        missingFileRecovered: true,
        gcpTested: false,
      },
      null,
      2
    )
  );
} finally {
  await runtime.close();
}

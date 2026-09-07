import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { dbSchema } from '@otr/core/db';
import {
  BeatmapFileSchema,
  BeatmapAttributeResultSchema,
} from '@otr/core/db/beatmap-attribute-schemas';
import {
  beatmaps,
  beatmapAttributeJobs as jobs,
  beatmapAttributes,
} from '@otr/core/db/schema';
import { ensureBeatmapPlaceholder } from '../osu/beatmap-store';
import {
  scheduleBeatmapAttributes,
  BeatmapAttributeService,
  getBeatmapAttribute,
} from './service';
import { LocalBeatmapFileStorage, BeatmapFileDownloader } from './storage';
import { calculateBeatmapAttributes, inspectBeatmap } from './calculator';
import { CALCULATOR_VERSION } from './policy';

const url = process.env.BEATMAP_ATTRIBUTES_TEST_DATABASE_URL;
if (url && new URL(url).port !== '5434')
  throw new Error(
    'Attribute integration tests require disposable PostgreSQL port 5434'
  );
const suite = url ? describe : describe.skip;
suite('persisted beatmap attribute lifecycle', () => {
  const pool = new Pool({ connectionString: url, max: 4 });
  const db = drizzle(pool, { schema: dbSchema });
  let directory: string;
  let fixture: Uint8Array;
  let nextId = 1_900_000_000;
  const created: number[] = [];
  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'otr-attributes-test-'));
    fixture = new Uint8Array(
      await readFile(
        new URL('./calculator-fixtures/2785319.osu', import.meta.url)
      )
    );
  });
  afterAll(async () => {
    for (const id of created)
      await db.delete(beatmaps).where(eq(beatmaps.id, id));
    await pool.end();
    await rm(directory, { recursive: true, force: true });
  });
  async function setup() {
    const osuId = nextId++;
    const beatmap = await ensureBeatmapPlaceholder(
      db,
      osuId,
      0,
      new Date().toISOString()
    );
    created.push(beatmap.id);
    let bytes = new TextEncoder().encode(
      new TextDecoder()
        .decode(fixture)
        .replace(/BeatmapID:\s*\d+/, `BeatmapID:${osuId}`)
    );
    const originalBytes = bytes;
    let downloads = 0;
    let calculations = 0;
    const storage = new LocalBeatmapFileStorage(directory);
    const downloader = new BeatmapFileDownloader({
      fetch: async () => {
        downloads++;
        return new Response(bytes);
      },
    });
    const calculate = async (
      content: Uint8Array,
      settings: Parameters<typeof calculateBeatmapAttributes>[1][]
    ) => {
      calculations++;
      const source = inspectBeatmap(content);
      return {
        sourceMode: source.mode,
        keyCount: source.keyCount,
        results: settings.map((input) => ({
          settings: input as never,
          attributes: calculateBeatmapAttributes(content, input),
        })),
      };
    };
    const service = new BeatmapAttributeService(
      db,
      storage,
      downloader,
      calculate
    );
    return {
      beatmap,
      service,
      storage,
      downloader,
      calculate,
      counts: () => ({ downloads, calculations }),
      sourceRevision: (revision: string) => {
        bytes = new TextEncoder().encode(
          new TextDecoder().decode(originalBytes) + revision
        );
      },
    };
  }
  test('NC, DT, and NC|DT schedule and resolve one result; missing files reacquire without duplicate results', async () => {
    const t = await setup();
    const inputs = [64, 512, 576].map((mods) => ({
      ruleset: 0,
      mods,
      lazer: false,
    }));
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: inputs,
    });
    expect(job!.requestedSettings).toHaveLength(1);
    expect(
      await t.service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('complete');
    expect(
      await t.service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('obsolete');
    const resolved = await Promise.all(
      inputs.map((input) => getBeatmapAttribute(db, t.beatmap.id, input))
    );
    expect(new Set(resolved.map((row) => row!.id)).size).toBe(1);
    expect(resolved[0]!.clockRate).toBe(1.5);
    const row = await db.query.beatmaps.findFirst({
      where: eq(beatmaps.id, t.beatmap.id),
      with: {
        beatmapFiles: { with: { attributes: true } },
        beatmapAttributes: { with: { file: true } },
      },
    });
    expect(BeatmapFileSchema.safeParse(row!.beatmapFiles[0]).success).toBe(
      true
    );
    expect(
      BeatmapAttributeResultSchema.safeParse(row!.beatmapAttributes[0]).success
    ).toBe(true);
    expect(row!.beatmapFiles).toHaveLength(1);
    expect(row!.beatmapAttributes).toHaveLength(1);
    expect(row!.beatmapAttributes[0].file.checksum).toBe(
      row!.beatmapFiles[0].checksum
    );
    await rm(join(directory, row!.beatmapFiles[0].storageKey));
    const repeated = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: inputs,
      recalculate: true,
    });
    expect(
      await t.service.process({
        jobId: repeated!.id,
        generation: repeated!.generation,
      })
    ).toBe('complete');
    expect(t.counts()).toEqual({ downloads: 2, calculations: 1 });
    expect(
      await db.query.beatmapAttributes.findMany({
        where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
      })
    ).toHaveLength(1);
  }, 30_000);
  test('concurrent NC aliases merge atomically and custom clock rates remain distinct', async () => {
    const t = await setup();
    await Promise.all(
      [64, 512, 576].map((mods) =>
        scheduleBeatmapAttributes(db, t.beatmap.id, {
          settings: [{ ruleset: 0, mods, lazer: false }],
        })
      )
    );
    const custom = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 512, lazer: false, clockRate: 1.2 }],
    });
    expect(custom!.requestedSettings).toHaveLength(2);
    expect(
      await t.service.process({
        jobId: custom!.id,
        generation: custom!.generation,
      })
    ).toBe('complete');
    const results = await db.query.beatmapAttributes.findMany({
      where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
    });
    expect(results.map((row) => row.clockRate).sort()).toEqual([1.2, 1.5]);
  }, 30_000);
  test('publication failure recovers and interrupted fourth attempts exhaust the budget', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false }],
    });
    await expect(
      t.service.reconcile(async () => {
        throw new Error('uncertain confirmation');
      }, false)
    ).rejects.toThrow();
    await db
      .update(jobs)
      .set({ publishedAt: new Date(0).toISOString() })
      .where(eq(jobs.id, job!.id));
    const published: string[] = [];
    await t.service.reconcile(async (message) => {
      published.push(message.jobId);
    }, false);
    expect(published).toContain(job!.id);
    await db
      .update(jobs)
      .set({
        status: 'processing',
        attempts: 4,
        leaseToken: 'interrupted',
        leaseExpiresAt: new Date(0).toISOString(),
      })
      .where(eq(jobs.id, job!.id));
    await t.service.reconcile(async () => undefined, false);
    expect(
      (await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, job!.id),
      }))!.status
    ).toBe('failed');
  });
  test('an obsolete late calculation cannot insert results or complete a newer generation', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false }],
    });
    const service = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async (bytes, settings) => {
        await scheduleBeatmapAttributes(db, t.beatmap.id, {
          settings: [{ ruleset: 0, mods: 64, lazer: false }],
          recalculate: true,
          refreshSource: true,
        });
        return t.calculate(bytes, settings);
      }
    );
    expect(
      await service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('obsolete');
    expect(
      await db.query.beatmapAttributes.findMany({
        where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
      })
    ).toHaveLength(0);
    const current = await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.id, job!.id),
    });
    expect(current!.generation).toBe(2);
    expect(current!.status).toBe('pending');
  }, 30_000);
  test('source A to B to A preserves history and keeps A current on later recalculation', async () => {
    const t = await setup();
    const settings = [{ ruleset: 0, mods: 0, lazer: false }];
    async function run(refreshSource = false) {
      const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
        settings,
        recalculate: true,
        refreshSource,
      });
      expect(
        await t.service.process({ jobId: job!.id, generation: job!.generation })
      ).toBe('complete');
      return (await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, job!.id),
      }))!.sourceFileId;
    }
    const first = await run();
    t.sourceRevision('\n// source revision B\n');
    const second = await run(true);
    expect(second).not.toBe(first);
    t.sourceRevision('');
    expect(await run(true)).toBe(first);
    expect(await run()).toBe(first);
    expect(t.counts().calculations).toBe(2);
    expect(
      await db.query.beatmapAttributes.findMany({
        where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
      })
    ).toHaveLength(2);
  }, 30_000);

  test('a partial calculator response cannot complete or persist a job', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id);
    const partial = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async () => ({ sourceMode: 0, keyCount: null, results: [] })
    );
    expect(
      await partial.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('retry');
    expect(
      await db.query.beatmapAttributes.findMany({
        where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
      })
    ).toHaveLength(0);
  });

  test('retryable calculation errors stop, terminal maps fail immediately, old calculator jobs stay obsolete', async () => {
    const t = await setup();
    let job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false }],
    });
    const service = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async () => {
        throw Object.assign(new Error('timeout'), {
          retryable: true,
          code: 'calculator_timeout',
        });
      }
    );
    for (let attempt = 1; attempt <= 4; attempt++) {
      await db
        .update(jobs)
        .set({ nextAttemptAt: new Date(0).toISOString() })
        .where(eq(jobs.id, job!.id));
      expect(
        await service.process({ jobId: job!.id, generation: job!.generation })
      ).toBe(attempt === 4 ? 'failed' : 'retry');
    }
    job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      recalculate: true,
    });
    await db
      .update(jobs)
      .set({ desiredCalculatorVersion: 'obsolete-version' })
      .where(eq(jobs.id, job!.id));
    expect(
      await t.service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('obsolete');
    await db
      .update(jobs)
      .set({ desiredCalculatorVersion: CALCULATOR_VERSION })
      .where(eq(jobs.id, job!.id));
    const terminal = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async () => {
        throw Object.assign(new Error('invalid'), {
          retryable: false,
          code: 'invalid_map',
        });
      }
    );
    expect(
      await terminal.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('failed');
  }, 30_000);
});

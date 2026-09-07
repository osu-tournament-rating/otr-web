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
import { prepareAttributeCommand } from './command';

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

  test('older schedulers cannot downgrade newer completed work and newer schedulers can rebuild older work', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id);
    await db
      .update(jobs)
      .set({
        desiredCalculatorVersion: 'rosu-pp-js@4.0.2+duration@1.0.1',
        desiredFormatVersion: 2,
        status: 'complete',
      })
      .where(eq(jobs.id, job!.id));
    await expect(scheduleBeatmapAttributes(db, t.beatmap.id)).rejects.toThrow(
      'newer'
    );
    await expect(
      scheduleBeatmapAttributes(db, t.beatmap.id, { recalculate: true })
    ).rejects.toThrow('newer');
    await t.service.reconcileVersions();
    const newer = await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.id, job!.id),
    });
    expect(newer).toMatchObject({
      generation: job!.generation,
      status: 'complete',
      desiredCalculatorVersion: 'rosu-pp-js@4.0.2+duration@1.0.1',
      desiredFormatVersion: 2,
    });
    await db
      .update(jobs)
      .set({
        desiredCalculatorVersion: 'rosu-pp-js@4.0.1+duration@1.0.0',
        desiredFormatVersion: 1,
      })
      .where(eq(jobs.id, job!.id));
    await t.service.reconcileVersions();
    const upgraded = await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.id, job!.id),
    });
    expect(upgraded).toMatchObject({
      generation: job!.generation + 1,
      status: 'pending',
      desiredCalculatorVersion: CALCULATOR_VERSION,
      desiredFormatVersion: 1,
    });
  });

  test('CLI rejects invalid settings without rows and preserves concurrently created metadata', async () => {
    const invalidId = nextId++;
    try {
      await expect(
        prepareAttributeCommand(db, {
          osuId: invalidId,
          ruleset: 6,
          lazer: false,
          create: true,
        })
      ).rejects.toThrow();
      expect(
        await db.query.beatmaps.findFirst({
          where: eq(beatmaps.osuId, invalidId),
        })
      ).toBeUndefined();
    } finally {
      await db.delete(beatmaps).where(eq(beatmaps.osuId, invalidId));
    }
    const t = await setup();
    await db
      .update(beatmaps)
      .set({
        ruleset: 1,
        diffName: 'Concurrent fetched metadata',
        dataFetchStatus: 2,
      })
      .where(eq(beatmaps.id, t.beatmap.id));
    const stored = await db.query.beatmaps.findFirst({
      where: eq(beatmaps.id, t.beatmap.id),
    });
    let first = true;
    const racedQuery = new Proxy(db.query.beatmaps, {
      get(target, property) {
        if (property === 'findFirst')
          return async (...args: Parameters<typeof target.findFirst>) => {
            if (first) {
              first = false;
              return undefined;
            }
            return target.findFirst(...args);
          };
        return Reflect.get(target, property);
      },
    });
    const racedDb = new Proxy(db, {
      get(target, property) {
        return property === 'query'
          ? { ...target.query, beatmaps: racedQuery }
          : Reflect.get(target, property);
      },
    });
    const result = await prepareAttributeCommand(racedDb, {
      osuId: stored!.osuId,
      ruleset: 0,
      lazer: false,
      create: true,
    });
    expect(result.settings[0].ruleset).toBe(0);
    expect(
      await db.query.beatmaps.findFirst({
        where: eq(beatmaps.id, t.beatmap.id),
      })
    ).toEqual(stored);
  });

  test('newer expired jobs remain untouched and version scanning reaches upgrades beyond its first page', async () => {
    const t = await setup();
    const future = [];
    for (let i = 0; i < 25; i++) {
      const map = await setup();
      const job = await scheduleBeatmapAttributes(db, map.beatmap.id);
      const id = `00000000-0000-0000-0000-${i.toString().padStart(12, '0')}`;
      await db
        .update(jobs)
        .set({
          id,
          desiredCalculatorVersion: 'future',
          status: 'processing',
          attempts: 4,
          leaseExpiresAt: new Date(0).toISOString(),
        })
        .where(eq(jobs.id, job!.id));
      future.push(id);
    }
    const older = await scheduleBeatmapAttributes(db, t.beatmap.id);
    await db
      .update(jobs)
      .set({
        id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        desiredCalculatorVersion: 'rosu-pp-js@4.0.1+duration@1.0.0',
      })
      .where(eq(jobs.id, older!.id));
    await t.service.reconcileVersions();
    await t.service.reconcileVersions();
    await t.service.reconcile(async () => undefined, false);
    expect(
      await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.beatmapId, t.beatmap.id),
      })
    ).toMatchObject({
      desiredCalculatorVersion: CALCULATOR_VERSION,
      generation: older!.generation + 1,
    });
    for (const id of future)
      expect(
        await db.query.beatmapAttributeJobs.findFirst({
          where: eq(jobs.id, id),
        })
      ).toMatchObject({
        status: 'processing',
        desiredCalculatorVersion: 'future',
        generation: 1,
      });
  });

  test('CLI inspection and invalid calculation arguments do not create absent beatmaps', async () => {
    const osuId = nextId++;
    for (const input of [
      { create: false },
      { create: true, mods: [128] },
      { create: true, clockRate: Infinity },
    ]) {
      await expect(
        prepareAttributeCommand(db, { osuId, lazer: false, ...input })
      ).rejects.toThrow();
      expect(
        await db.query.beatmaps.findFirst({ where: eq(beatmaps.osuId, osuId) })
      ).toBeUndefined();
    }
    const result = await prepareAttributeCommand(db, {
      osuId,
      ruleset: 5,
      lazer: false,
      create: true,
    });
    created.push(result.beatmap.id);
    expect(result.beatmap.ruleset).toBe(5);
    expect(result.settings.map((setting) => setting.mods)).toEqual([0, 64]);
  });

  test('metadata refetch refreshes the source without losing custom settings or resetting a pending refresh', async () => {
    const t = await setup();
    const custom = [{ ruleset: 0, mods: 512, clockRate: 1.25, lazer: true }];
    const first = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: custom,
    });
    await t.service.process({
      jobId: first!.id,
      generation: first!.generation,
    });
    t.sourceRevision('\n// revised source\n');
    await db
      .update(beatmaps)
      .set({ dataFetchStatus: 2, updated: new Date().toISOString() })
      .where(eq(beatmaps.id, t.beatmap.id));
    const refreshed = await scheduleBeatmapAttributes(db, t.beatmap.id);
    expect(refreshed!.refreshSource).toBe(true);
    expect(refreshed!.requestedSettings).toEqual(first!.requestedSettings);
    const duplicate = await scheduleBeatmapAttributes(db, t.beatmap.id);
    expect(duplicate!.generation).toBe(refreshed!.generation);
    const extended = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false }],
    });
    expect(extended!.refreshSource).toBe(true);
    expect(extended!.requestedSettings).toContainEqual(
      first!.requestedSettings[0]
    );
    expect(
      await t.service.process({
        jobId: extended!.id,
        generation: extended!.generation,
      })
    ).toBe('complete');
    expect(t.counts()).toEqual({ downloads: 2, calculations: 2 });
    const result = await getBeatmapAttribute(db, t.beatmap.id, custom[0]);
    expect(result!.clockRate).toBe(1.25);
    expect(result!.settings.lazer).toBe(true);
    expect(
      await db.query.beatmapAttributes.findMany({
        where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
      })
    ).toHaveLength(3);
  });

  test('reconciliation recovers missed metadata callbacks once, including backwards or null timestamps', async () => {
    const t = await setup();
    const initial = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false }],
    });
    await t.service.process({
      jobId: initial!.id,
      generation: initial!.generation,
    });
    t.sourceRevision('\n// missed callback source revision\n');
    for (const updated of [
      '2026-01-02T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z',
      null,
    ]) {
      await db
        .update(beatmaps)
        .set({ dataFetchStatus: 2, updated })
        .where(eq(beatmaps.id, t.beatmap.id));
      // Metadata committed but its scheduling callback never ran.
      await t.service.reconcileSources();
      const refreshed = (await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, initial!.id),
      }))!;
      expect(refreshed.refreshSource).toBe(true);
      expect(refreshed.sourceMetadataUpdatedAt).not.toBeNull();
      expect(
        await t.service.process({
          jobId: refreshed.id,
          generation: refreshed.generation,
        })
      ).toBe('complete');
      await t.service.reconcileSources();
      const repeated = (await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, initial!.id),
      }))!;
      expect(repeated).toMatchObject({
        status: 'complete',
        generation: refreshed.generation,
        refreshSource: false,
      });
    }
    expect(t.counts()).toEqual({ downloads: 4, calculations: 2 });
    expect(
      await db.query.beatmapAttributes.findMany({
        where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
      })
    ).toHaveLength(2);
    await db
      .update(beatmaps)
      .set({ manualOverride: true, updated: new Date().toISOString() })
      .where(eq(beatmaps.id, t.beatmap.id));
    await t.service.reconcileSources();
    expect(
      (await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, initial!.id),
      }))!.refreshSource
    ).toBe(false);
  });

  test('failed metadata refreshes retain their retry budget and late calculations cannot clear newer refresh intent', async () => {
    const t = await setup();
    const initial = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false }],
    });
    const racing = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async (bytes, settings) => {
        await db
          .update(beatmaps)
          .set({ dataFetchStatus: 2, updated: '2026-01-02T00:00:00.000Z' })
          .where(eq(beatmaps.id, t.beatmap.id));
        await t.service.reconcileSources();
        return t.calculate(bytes, settings);
      }
    );
    expect(
      await racing.process({
        jobId: initial!.id,
        generation: initial!.generation,
      })
    ).toBe('obsolete');
    let current = (await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.id, initial!.id),
    }))!;
    expect(current).toMatchObject({
      generation: initial!.generation + 1,
      refreshSource: true,
      status: 'pending',
    });
    expect(
      await db.query.beatmapAttributes.findMany({
        where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
      })
    ).toHaveLength(0);
    const failing = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async () => {
        throw Object.assign(new Error('timeout'), { retryable: true });
      }
    );
    for (let attempt = 1; attempt <= 4; attempt++) {
      await db
        .update(jobs)
        .set({ nextAttemptAt: new Date(0).toISOString() })
        .where(eq(jobs.id, current.id));
      expect(
        await failing.process({
          jobId: current.id,
          generation: current.generation,
        })
      ).toBe(attempt === 4 ? 'failed' : 'retry');
      await t.service.reconcileSources();
      current = (await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, initial!.id),
      }))!;
      expect(current.attempts).toBe(attempt);
      expect(current.generation).toBe(initial!.generation + 1);
    }
    expect(current.status).toBe('failed');
  });

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

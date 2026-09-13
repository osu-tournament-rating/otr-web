import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import { Beatmap, Difficulty } from 'rosu-pp-js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { dbSchema } from '@otr/core/db';
import {
  BeatmapFileSchema,
  BeatmapAttributeResultSchema,
} from '@otr/core/db/beatmap-attribute-schemas';
import {
  beatmaps,
  beatmapFiles,
  beatmapAttributeJobs as jobs,
  beatmapAttributes,
} from '@otr/core/db/schema';
import { ensureBeatmapPlaceholder } from '../osu/beatmap-store';
import {
  scheduleBeatmapAttributes,
  recordBeatmapAttributeIntent,
  BeatmapAttributeService,
  getBeatmapAttribute,
} from './service';
import {
  LocalBeatmapFileStorage,
  BeatmapFileDownloader,
  type BeatmapFileStorage,
} from './storage';
import { calculateBeatmapAttributes, inspectBeatmap } from './calculator';
import { CALCULATOR_VERSION } from './policy';
import {
  CALCULATION_FORMAT_VERSION,
  createCalculationIdentity,
} from '@otr/core/osu/beatmap-attributes';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import { prepareAttributeCommand } from './command';

const url = process.env.BEATMAP_ATTRIBUTES_TEST_DATABASE_URL;
if (
  url &&
  new URL(url).port !== '5434' &&
  !(process.env.GITHUB_ACTIONS === 'true' && new URL(url).port === '5432')
)
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
      beatmap: { ...beatmap, osuId },
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
  test('checkpoints the acquired source before calculator failure and reuses it on retry', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false as const }],
      refreshSource: true,
    });
    const service = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async () => {
        const files = await db.query.beatmapFiles.findMany({
          where: eq(beatmapFiles.beatmapId, t.beatmap.id),
        });
        expect(files).toHaveLength(1);
        throw new Error('calculator interrupted');
      }
    );
    expect(
      await service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('retry');
    const files = await db.query.beatmapFiles.findMany({
      where: eq(beatmapFiles.beatmapId, t.beatmap.id),
    });
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      fetchStatus: DataFetchStatus.Fetched,
      errorCode: null,
      sourceMode: null,
    });
    expect(files[0].checksum).toBeString();
    expect(files[0].storageKey).toBeString();
    expect(files[0].acquiredAt).toBeString();
    const pending = await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.id, job!.id),
    });
    expect(pending).toMatchObject({
      acquiredFileId: files[0].id,
      sourceFileId: null,
    });
    await db
      .update(jobs)
      .set({ nextAttemptAt: new Date(0).toISOString() })
      .where(eq(jobs.id, job!.id));
    expect(
      await t.service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('complete');
    expect(t.counts().downloads).toBe(1);
  });

  test('records an acquisition attempt before issuing the HTTP request', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id);
    let observed = 0;
    const downloader = new BeatmapFileDownloader({
      fetch: async () => {
        observed = (
          await db.query.beatmapFiles.findMany({
            where: eq(beatmapFiles.beatmapId, t.beatmap.id),
          })
        ).length;
        return new Response(null, { status: 404 });
      },
    });
    const service = new BeatmapAttributeService(
      db,
      t.storage,
      downloader,
      t.calculate
    );
    expect(
      await service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('failed');
    expect(observed).toBe(1);
    const files = await db.query.beatmapFiles.findMany({
      where: eq(beatmapFiles.beatmapId, t.beatmap.id),
    });
    expect(files[0]).toMatchObject({
      fetchStatus: DataFetchStatus.NotFound,
      errorCode: 'not_found',
      checksum: null,
      storageKey: null,
      byteLength: null,
      acquiredAt: null,
    });
    expect(files[0].lastFetchAttempt).toBeString();
  });

  test('NC, DT, and NC|DT schedule and resolve one result; missing files reacquire without duplicate results', async () => {
    const t = await setup();
    const inputs = [64, 512, 576].map((mods) => ({
      ruleset: 0,
      mods,
      lazer: false as const,
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
    await rm(join(directory, row!.beatmapFiles[0].storageKey!));
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
  test('concurrent NC aliases merge atomically and unsupported settings reject without mutation', async () => {
    const t = await setup();
    await Promise.all(
      [64, 512, 576].map((mods) =>
        scheduleBeatmapAttributes(db, t.beatmap.id, {
          settings: [{ ruleset: 0, mods, lazer: false as const }],
        })
      )
    );
    const job = (await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.beatmapId, t.beatmap.id),
    }))!;
    expect(job.requestedSettings).toHaveLength(1);
    for (const settings of [
      { ruleset: 0, mods: 64, clockRate: 1.2, lazer: false as const },
      { ruleset: 0, mods: 0, lazer: true },
    ])
      await expect(
        scheduleBeatmapAttributes(db, t.beatmap.id, {
          settings: [settings as never],
        })
      ).rejects.toThrow();
    expect(
      await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, job.id),
      })
    ).toEqual(job);
  });
  test('publication failure recovers and interrupted fourth attempts exhaust the budget', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false as const }],
    });
    await expect(
      t.service.reconcile(async () => {
        throw new Error('uncertain confirmation');
      })
    ).rejects.toThrow();
    await db
      .update(jobs)
      .set({ publishedAt: new Date(0).toISOString() })
      .where(eq(jobs.id, job!.id));
    const published: string[] = [];
    await t.service.reconcile(async (message) => {
      published.push(message.jobId);
    });
    expect(published).toContain(job!.id);
    const [attempt] = await db
      .insert(beatmapFiles)
      .values({
        beatmapId: t.beatmap.id,
        osuBeatmapId: t.beatmap.osuId,
        provider: 'local',
        sourceUrl: `https://osu.ppy.sh/osu/${t.beatmap.osuId}`,
        fetchStatus: DataFetchStatus.Fetching,
        lastFetchAttempt: new Date(0).toISOString(),
      })
      .returning();
    await db
      .update(jobs)
      .set({
        acquiredFileId: attempt.id,
        status: 'processing',
        attempts: 4,
        leaseToken: 'interrupted',
        leaseExpiresAt: new Date(0).toISOString(),
      })
      .where(eq(jobs.id, job!.id));
    await t.service.reconcile(async () => undefined);
    expect(
      (await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, job!.id),
      }))!.status
    ).toBe('failed');
    expect(
      await db.query.beatmapFiles.findFirst({
        where: eq(beatmapFiles.id, attempt.id),
      })
    ).toMatchObject({
      fetchStatus: DataFetchStatus.Error,
      errorCode: 'attempt_budget_exhausted',
    });
  });
  test('an obsolete late calculation cannot insert results or complete a newer generation', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false as const }],
    });
    const service = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async (bytes, settings) => {
        await scheduleBeatmapAttributes(db, t.beatmap.id, {
          settings: [{ ruleset: 0, mods: 64, lazer: false as const }],
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
  test.each(['recalculate', 'settings extension'] as const)(
    'changing providers preserves the current checksum during %s',
    async (trigger) => {
      const t = await setup();
      const objects = new Map<string, Uint8Array>();
      const other: BeatmapFileStorage = {
        provider: 'gcp',
        get: async (key) => objects.get(key) ?? null,
        put: async (key, bytes) => {
          objects.set(key, bytes);
        },
      };
      const otherService = new BeatmapAttributeService(
        db,
        other,
        t.downloader,
        t.calculate
      );
      const settings = [{ ruleset: 0, mods: 0, lazer: false as const }];
      const run = async (
        service: BeatmapAttributeService,
        options: Parameters<typeof scheduleBeatmapAttributes>[2]
      ) => {
        const job = await scheduleBeatmapAttributes(db, t.beatmap.id, options);
        expect(
          await service.process({ jobId: job!.id, generation: job!.generation })
        ).toBe('complete');
        return (await getBeatmapAttribute(db, t.beatmap.id, settings[0]))!;
      };
      const original = await run(t.service, { settings });
      t.sourceRevision('\n// current source revision\n');
      const current = await run(otherService, {
        settings,
        refreshSource: true,
      });
      expect(current.checksum).not.toBe(original.checksum);
      const restored = await run(
        t.service,
        trigger === 'settings extension'
          ? { settings: [{ ruleset: 0, mods: 64, lazer: false as const }] }
          : { settings, recalculate: true }
      );
      expect(restored.checksum).toBe(current.checksum);
      expect(restored.fileId).not.toBe(original.fileId);
      expect(t.counts().downloads).toBe(3);
      // Both providers now hold the current checksum, so another round trip reuses it.
      expect(
        (await run(otherService, { settings, recalculate: true })).checksum
      ).toBe(current.checksum);
      expect((await run(t.service, { settings, recalculate: true })).id).toBe(
        restored.id
      );
      expect(t.counts().downloads).toBe(3);
    }
  );

  test('source A to B to A preserves history and keeps A current on later recalculation', async () => {
    const t = await setup();
    const settings = [{ ruleset: 0, mods: 0, lazer: false as const }];
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

  test('ordinary ingestion preserves another calculator target; explicit recalculation changes it', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id);
    await db
      .update(jobs)
      .set({
        desiredCalculatorVersion: 'future-calculator',
        desiredFormatVersion: 99,
        status: 'complete',
      })
      .where(eq(jobs.id, job!.id));
    const refreshed = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      refreshSource: true,
    });
    expect(refreshed).toMatchObject({
      desiredCalculatorVersion: 'future-calculator',
      desiredFormatVersion: 99,
      refreshSource: true,
    });
    expect(
      await t.service.process({
        jobId: refreshed!.id,
        generation: refreshed!.generation,
      })
    ).toBe('obsolete');
    const published: string[] = [];
    await t.service.reconcile(async (message) => {
      published.push(message.jobId);
    });
    expect(published).not.toContain(job!.id);
    const rebuilt = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      recalculate: true,
    });
    expect(rebuilt).toMatchObject({
      desiredCalculatorVersion: CALCULATOR_VERSION,
      desiredFormatVersion: CALCULATION_FORMAT_VERSION,
      status: 'pending',
    });
  });

  test('CLI rejects invalid settings without rows and preserves concurrently created metadata', async () => {
    const invalidId = nextId++;
    try {
      await expect(
        prepareAttributeCommand(db, {
          osuId: invalidId,
          ruleset: 6,
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
      create: true,
    });
    expect(result.settings[0].ruleset).toBe(0);
    expect(
      await db.query.beatmaps.findFirst({
        where: eq(beatmaps.id, t.beatmap.id),
      })
    ).toEqual(stored);
  });

  test('metadata and its scheduling intent roll back together and committed intent recovers without publication', async () => {
    const t = await setup();
    await expect(
      db.transaction(async (tx) => {
        await tx
          .update(beatmaps)
          .set({ diffName: 'uncommitted metadata' })
          .where(eq(beatmaps.id, t.beatmap.id));
        await recordBeatmapAttributeIntent(tx, t.beatmap.id, {
          refreshSource: true,
        });
        throw new Error('interrupted before commit');
      })
    ).rejects.toThrow('interrupted');
    expect(
      await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.beatmapId, t.beatmap.id),
      })
    ).toBeUndefined();
    expect(
      (await db.query.beatmaps.findFirst({
        where: eq(beatmaps.id, t.beatmap.id),
      }))!.diffName
    ).toBe('Pending fetch');
    const committed = await db.transaction(async (tx) => {
      await tx
        .update(beatmaps)
        .set({ diffName: 'committed metadata' })
        .where(eq(beatmaps.id, t.beatmap.id));
      return recordBeatmapAttributeIntent(tx, t.beatmap.id, {
        refreshSource: true,
      });
    });
    const published: string[] = [];
    await t.service.reconcile(async (message) => {
      published.push(message.jobId);
    });
    expect(published).toContain(committed!.id);
  });

  test('CLI inspection and invalid calculation arguments do not create absent beatmaps', async () => {
    const osuId = nextId++;
    for (const input of [{ create: false }, { create: true, mods: [128] }]) {
      await expect(
        prepareAttributeCommand(db, { osuId, ...input })
      ).rejects.toThrow();
      expect(
        await db.query.beatmaps.findFirst({ where: eq(beatmaps.osuId, osuId) })
      ).toBeUndefined();
    }
    const result = await prepareAttributeCommand(db, {
      osuId,
      ruleset: 5,
      create: true,
    });
    created.push(result.beatmap.id);
    expect(result.beatmap.ruleset).toBe(5);
    expect(result.settings.map((setting) => setting.mods)).toEqual([0, 64]);
  });

  test('a failed refresh preserves completed results while retries reuse its newly fetched source', async () => {
    const t = await setup();
    const settings = [{ ruleset: 0, mods: 64, lazer: false as const }];
    const original = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings,
    });
    expect(
      await t.service.process({
        jobId: original!.id,
        generation: original!.generation,
      })
    ).toBe('complete');
    const originalResult = await getBeatmapAttribute(
      db,
      t.beatmap.id,
      settings[0]
    );
    t.sourceRevision('\n// refreshed source\n');
    const refreshed = await db.transaction((tx) =>
      recordBeatmapAttributeIntent(tx, t.beatmap.id, { refreshSource: true })
    );
    expect(refreshed!.requestedSettings).toEqual(original!.requestedSettings);
    const failing = new BeatmapAttributeService(
      db,
      t.storage,
      t.downloader,
      async () => {
        throw new Error('calculator interrupted');
      }
    );
    for (let attempt = 1; attempt <= 4; attempt++) {
      await db
        .update(jobs)
        .set({ nextAttemptAt: new Date(0).toISOString() })
        .where(eq(jobs.id, refreshed!.id));
      expect(
        await failing.process({
          jobId: refreshed!.id,
          generation: refreshed!.generation,
        })
      ).toBe(attempt === 4 ? 'failed' : 'retry');
      expect(
        (await getBeatmapAttribute(db, t.beatmap.id, settings[0]))!.id
      ).toBe(originalResult!.id);
    }
    expect(t.counts().downloads).toBe(2);
    const failed = (await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.id, refreshed!.id),
    }))!;
    expect(failed.acquiredFileId).not.toBe(failed.sourceFileId);
    const restarted = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      recalculate: true,
      settings,
    });
    expect(
      await t.service.process({
        jobId: restarted!.id,
        generation: restarted!.generation,
      })
    ).toBe('complete');
    expect(t.counts().downloads).toBe(2);
    expect(
      (await getBeatmapAttribute(db, t.beatmap.id, settings[0]))!.id
    ).not.toBe(originalResult!.id);
  });

  test('a new source generation abandons its Fetching attempt without allowing a late checkpoint', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id);
    const downloader = new BeatmapFileDownloader({
      fetch: async () => {
        await scheduleBeatmapAttributes(db, t.beatmap.id, {
          refreshSource: true,
        });
        return new Response(
          new TextDecoder()
            .decode(fixture)
            .replace(/BeatmapID:\s*\d+/, `BeatmapID:${t.beatmap.osuId}`)
        );
      },
    });
    const service = new BeatmapAttributeService(
      db,
      t.storage,
      downloader,
      t.calculate
    );
    expect(
      await service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('obsolete');
    const files = await db.query.beatmapFiles.findMany({
      where: eq(beatmapFiles.beatmapId, t.beatmap.id),
    });
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      fetchStatus: DataFetchStatus.Error,
      errorCode: 'obsolete_generation',
      checksum: null,
    });
    const current = await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.id, job!.id),
    });
    expect(current).toMatchObject({
      acquiredFileId: null,
      sourceFileId: null,
      generation: job!.generation + 1,
      status: 'pending',
    });
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

  test.each(['600', '864000000000000000'])(
    'persists a throttled downloader not-before time across worker restart (%s)',
    async (retryAfter) => {
      const t = await setup();
      const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
        settings: [{ ruleset: 0, mods: 0, lazer: false as const }],
      });
      const retryNotBefore = new Date(
        retryAfter === '600' ? Date.now() + 600_000 : 8_640_000_000_000_000
      );
      const throttled = new BeatmapAttributeService(
        db,
        t.storage,
        new BeatmapFileDownloader({
          fetch: async () =>
            new Response(null, {
              status: 429,
              headers: { 'Retry-After': retryAfter },
            }),
        }),
        t.calculate
      );
      expect(
        await throttled.process({ jobId: job!.id, generation: job!.generation })
      ).toBe('retry');
      const pending = (await db.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.id, job!.id),
      }))!;
      expect(new Date(pending.nextAttemptAt).getTime()).toBeGreaterThanOrEqual(
        retryNotBefore.getTime()
      );
      const restarted = new BeatmapAttributeService(
        db,
        t.storage,
        t.downloader,
        t.calculate
      );
      expect(
        await restarted.process({ jobId: job!.id, generation: job!.generation })
      ).toBe('obsolete');
      expect(t.counts().downloads).toBe(0);
      expect(pending.attempts).toBe(1);
    }
  );

  test('retryable calculation errors stop, terminal maps fail immediately, old calculator jobs stay obsolete', async () => {
    const t = await setup();
    let job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false as const }],
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
  test('refresh and acquisition checkpoints use the same lock order', async () => {
    const t = await setup();
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id);
    const [file] = await db
      .insert(beatmapFiles)
      .values({
        beatmapId: t.beatmap.id,
        osuBeatmapId: t.beatmap.osuId,
        provider: 'local',
        sourceUrl: `https://osu.ppy.sh/osu/${t.beatmap.osuId}`,
        fetchStatus: DataFetchStatus.Fetching,
        lastFetchAttempt: new Date().toISOString(),
      })
      .returning();
    await db
      .update(jobs)
      .set({ acquiredFileId: file.id })
      .where(eq(jobs.id, job!.id));
    const holder = await pool.connect();
    const checkpoint = await pool.connect();
    const waitForLocks = async (count: number) => {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const result = await pool.query(
          `SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`
        );
        if (result.rows[0].count >= count) return;
        await Bun.sleep(10);
      }
      throw new Error('Expected concurrent database lock waits');
    };
    try {
      await holder.query('BEGIN');
      await holder.query(
        'SELECT id FROM beatmap_files WHERE id = $1 FOR UPDATE',
        [file.id]
      );
      const refresh = scheduleBeatmapAttributes(db, t.beatmap.id, {
        refreshSource: true,
      });
      // Observe the refresh blocked on the held file before starting a competing checkpoint.
      await waitForLocks(1);
      const finish = (async () => {
        await checkpoint.query('BEGIN');
        try {
          await checkpoint.query(
            'SELECT id FROM beatmap_attribute_jobs WHERE id = $1 FOR UPDATE',
            [job!.id]
          );
          await checkpoint.query(
            'SELECT id FROM beatmap_files WHERE id = $1 FOR UPDATE',
            [file.id]
          );
          await checkpoint.query('COMMIT');
        } catch (error) {
          await checkpoint.query('ROLLBACK');
          throw error;
        }
      })();
      const outcomes = Promise.allSettled([refresh, finish]);
      await waitForLocks(2);
      await holder.query('COMMIT');
      expect((await outcomes).map((outcome) => outcome.status)).toEqual([
        'fulfilled',
        'fulfilled',
      ]);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
      checkpoint.release();
    }
  }, 10_000);
  test('legacy results remain in history until explicit recalculation supplies the supported format', async () => {
    const t = await setup();
    const settings = { ruleset: 0, mods: 0, lazer: false as const };
    const job = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [settings],
    });
    expect(
      await t.service.process({ jobId: job!.id, generation: job!.generation })
    ).toBe('complete');
    const current = (await getBeatmapAttribute(db, t.beatmap.id, settings))!;
    const file = (await db.query.beatmapFiles.findFirst({
      where: eq(beatmapFiles.id, current.fileId),
    }))!;
    const map = new Beatmap((await t.storage.get(file.storageKey!))!);
    const difficulty = new Difficulty({ mods: 0, clockRate: 1, lazer: false });
    const legacyVersion = 'rosu-pp-js@4.0.1+duration@1.0.1';
    try {
      await db
        .update(beatmapAttributes)
        .set({
          formatVersion: 1,
          calculatorVersion: legacyVersion,
          identity: createCalculationIdentity({
            settings,
            checksum: current.checksum,
            calculatorVersion: legacyVersion,
            formatVersion: 1,
          }),
          difficulty: {
            version: 1,
            mode: 0,
            isConvert: false,
            keyCount: null,
            attributes: difficulty.calculate(map),
          } as never,
        })
        .where(eq(beatmapAttributes.id, current.id));
    } finally {
      difficulty.free();
      map.free();
    }
    await db
      .update(jobs)
      .set({ desiredFormatVersion: 1, desiredCalculatorVersion: legacyVersion })
      .where(eq(jobs.id, job!.id));
    expect(
      await getBeatmapAttribute(db, t.beatmap.id, settings)
    ).toBeUndefined();
    const before = (await db.query.beatmaps.findFirst({
      where: eq(beatmaps.id, t.beatmap.id),
      with: { beatmapAttributes: true, beatmapAttributeJobs: true },
    }))!;
    expect(before.beatmapAttributes.map((row) => row.id)).toEqual([current.id]);
    expect(before.beatmapAttributeJobs[0].sourceFileId).toBe(current.fileId);
    const rebuilt = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [settings],
      recalculate: true,
    });
    expect(
      await t.service.process({
        jobId: rebuilt!.id,
        generation: rebuilt!.generation,
      })
    ).toBe('complete');
    expect(
      BeatmapAttributeResultSchema.parse(
        await getBeatmapAttribute(db, t.beatmap.id, settings)
      ).formatVersion
    ).toBe(CALCULATION_FORMAT_VERSION);
    const history = await db.query.beatmapAttributes.findMany({
      where: eq(beatmapAttributes.beatmapId, t.beatmap.id),
    });
    expect(history.map((row) => row.formatVersion).sort()).toEqual([1, 2]);
    expect(history.find((row) => row.formatVersion === 1)?.id).toBe(current.id);
    expect(t.counts().downloads).toBe(1);
  });

  test('a refreshed generation downloads its own source while an obsolete download is in flight', async () => {
    const t = await setup();
    const oldBytes = new TextEncoder().encode(
      new TextDecoder()
        .decode(fixture)
        .replace(/BeatmapID:\s*\d+/, `BeatmapID:${t.beatmap.osuId}`)
    );
    const newBytes = new TextEncoder().encode(
      new TextDecoder().decode(oldBytes) + '\n// refreshed source\n'
    );
    let release!: () => void;
    let started!: () => void;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const firstStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    let requests = 0;
    const downloader = new BeatmapFileDownloader({
      concurrency: 2,
      fetch: async () => {
        requests++;
        if (requests === 1) {
          started();
          await held;
          return new Response(oldBytes);
        }
        return new Response(newBytes);
      },
    });
    const service = new BeatmapAttributeService(
      db,
      t.storage,
      downloader,
      t.calculate
    );
    const first = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      settings: [{ ruleset: 0, mods: 0, lazer: false }],
    });
    const oldWork = service.process({
      jobId: first!.id,
      generation: first!.generation,
    });
    await firstStarted;
    const second = await scheduleBeatmapAttributes(db, t.beatmap.id, {
      refreshSource: true,
    });
    const newWork = service.process({
      jobId: second!.id,
      generation: second!.generation,
    });
    try {
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const rows = await db.query.beatmapFiles.findMany({
          where: eq(beatmapFiles.beatmapId, t.beatmap.id),
        });
        if (rows.length === 2) break;
        await Bun.sleep(10);
      }
      await Bun.sleep(25);
    } finally {
      release();
    }
    expect(await Promise.all([oldWork, newWork])).toEqual([
      'obsolete',
      'complete',
    ]);
    expect(requests).toBe(2);
    const completed = (await db.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.id, second!.id),
      with: { sourceFile: true },
    }))!;
    const bytes = await t.storage.get(completed.sourceFile!.storageKey!);
    expect(bytes).toEqual(newBytes);
    expect(completed.sourceFile!.fetchStatus).toBe(DataFetchStatus.Fetched);
  }, 10_000);
});

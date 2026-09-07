import { randomUUID } from 'node:crypto';
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from 'drizzle-orm';
import {
  beatmapAttributes,
  beatmapAttributeJobs as jobs,
  beatmapFiles,
  beatmaps,
} from '@otr/core/db/schema';
import {
  CALCULATION_FORMAT_VERSION,
  CalculatedBeatmapAttributesSchema,
  createCalculationIdentity,
  getDefaultCalculationSettings,
  normalizeCalculationRequests,
  normalizeCalculationSettings,
  type CalculationSettingsInput,
} from '@otr/core/osu/beatmap-attributes';
import { DataFetchStatus } from '@otr/core/db/data-fetch-status';
import type { DatabaseClient } from '../db';
import {
  acquireBeatmapFile,
  type BeatmapFileStorage,
  BeatmapFileDownloader,
} from './storage';
import { calculateInProcess } from './calculator-process';
import {
  CALCULATOR_VERSION,
  LEASE_MS,
  MAX_ATTEMPTS,
  PUBLISH_LEASE_MS,
  retryDelayMs,
} from './policy';

export function isJobClaimable(
  job: {
    status: string;
    attempts: number;
    leaseExpiresAt: string | null;
    nextAttemptAt: string;
  },
  generation: number,
  messageGeneration: number,
  now: Date
): boolean {
  return (
    generation === messageGeneration &&
    job.attempts < MAX_ATTEMPTS &&
    new Date(job.nextAttemptAt) <= now &&
    (job.status === 'pending' ||
      (job.status === 'processing' &&
        job.leaseExpiresAt !== null &&
        new Date(job.leaseExpiresAt) <= now))
  );
}

export async function scheduleBeatmapAttributes(
  db: DatabaseClient,
  beatmapId: number,
  options: {
    settings?: CalculationSettingsInput[];
    recalculate?: boolean;
    refreshSource?: boolean;
  } = {}
) {
  return db.transaction(async (tx) => {
    const [beatmap] = await tx
      .select()
      .from(beatmaps)
      .where(eq(beatmaps.id, beatmapId))
      .for('update');
    if (!beatmap) throw new Error('Beatmap does not exist');
    const settings = options.settings
      ? normalizeCalculationRequests(options.settings)
      : getDefaultCalculationSettings(beatmap.ruleset);
    const values = {
      beatmapId,
      requestedSettings: settings,
      refreshSource: options.refreshSource ?? false,
      desiredCalculatorVersion: CALCULATOR_VERSION,
      desiredFormatVersion: CALCULATION_FORMAT_VERSION,
    };
    if (options.recalculate || options.refreshSource) {
      await tx
        .insert(jobs)
        .values({ id: randomUUID(), ...values })
        .onConflictDoUpdate({
          target: jobs.beatmapId,
          set: {
            ...values,
            generation: sql`${jobs.generation}+1`,
            status: 'pending',
            attempts: 0,
            leaseToken: null,
            leaseExpiresAt: null,
            publishedAt: null,
            nextAttemptAt: new Date().toISOString(),
            requestedAt: new Date().toISOString(),
            errorCode: null,
          },
        });
    } else {
      await tx
        .insert(jobs)
        .values({ id: randomUUID(), ...values })
        .onConflictDoNothing();
      const existing = await tx.query.beatmapAttributeJobs.findFirst({
        where: eq(jobs.beatmapId, beatmapId),
      });
      if (
        existing &&
        (JSON.stringify(
          normalizeCalculationRequests(existing.requestedSettings)
        ) !== JSON.stringify(settings) ||
          existing.desiredCalculatorVersion !== CALCULATOR_VERSION ||
          existing.desiredFormatVersion !== CALCULATION_FORMAT_VERSION)
      ) {
        const merged = normalizeCalculationRequests([
          ...existing.requestedSettings,
          ...settings,
        ]);
        if (
          JSON.stringify(merged) !==
            JSON.stringify(
              normalizeCalculationRequests(existing.requestedSettings)
            ) ||
          existing.desiredCalculatorVersion !== CALCULATOR_VERSION ||
          existing.desiredFormatVersion !== CALCULATION_FORMAT_VERSION
        ) {
          await tx
            .update(jobs)
            .set({
              requestedSettings: merged,
              desiredCalculatorVersion: CALCULATOR_VERSION,
              desiredFormatVersion: CALCULATION_FORMAT_VERSION,
              generation: sql`${jobs.generation}+1`,
              status: 'pending',
              attempts: 0,
              leaseToken: null,
              leaseExpiresAt: null,
              publishedAt: null,
              nextAttemptAt: new Date().toISOString(),
              errorCode: null,
            })
            .where(
              and(
                eq(jobs.id, existing.id),
                eq(jobs.generation, existing.generation)
              )
            );
        }
      }
    }
    return tx.query.beatmapAttributeJobs.findFirst({
      where: eq(jobs.beatmapId, beatmapId),
    });
  });
}

export class BeatmapAttributeService {
  constructor(
    private readonly db: DatabaseClient,
    private readonly storage: BeatmapFileStorage,
    private readonly downloader: BeatmapFileDownloader,
    private readonly calculate = calculateInProcess
  ) {}

  async reconcile(
    publish: (payload: {
      jobId: string;
      generation: number;
    }) => Promise<unknown>,
    discover = true
  ): Promise<number> {
    if (discover) {
      const missing = await this.db
        .select({ id: beatmaps.id })
        .from(beatmaps)
        .leftJoin(jobs, eq(jobs.beatmapId, beatmaps.id))
        .where(
          and(
            eq(beatmaps.dataFetchStatus, DataFetchStatus.Fetched),
            isNull(jobs.id)
          )
        )
        .limit(25);
      for (const row of missing)
        await scheduleBeatmapAttributes(this.db, row.id);
      const outdated = await this.db.query.beatmapAttributeJobs.findMany({
        where: or(
          ne(jobs.desiredCalculatorVersion, CALCULATOR_VERSION),
          ne(jobs.desiredFormatVersion, CALCULATION_FORMAT_VERSION)
        ),
        limit: 25,
      });
      for (const row of outdated)
        await scheduleBeatmapAttributes(this.db, row.beatmapId, {
          settings: row.requestedSettings,
          recalculate: true,
        });
    }
    const now = new Date();
    await this.db
      .update(jobs)
      .set({
        status: 'failed',
        leaseToken: null,
        leaseExpiresAt: null,
        errorCode: 'attempt_budget_exhausted',
      })
      .where(
        and(
          eq(jobs.status, 'processing'),
          lte(jobs.leaseExpiresAt, now.toISOString()),
          sql`${jobs.attempts} >= ${MAX_ATTEMPTS}`
        )
      );
    const due = await this.db.query.beatmapAttributeJobs.findMany({
      where: and(
        lte(jobs.nextAttemptAt, now.toISOString()),
        lt(jobs.attempts, MAX_ATTEMPTS),
        or(
          eq(jobs.status, 'pending'),
          and(
            eq(jobs.status, 'processing'),
            lte(jobs.leaseExpiresAt, now.toISOString())
          )
        ),
        or(
          isNull(jobs.publishedAt),
          lte(
            jobs.publishedAt,
            new Date(now.getTime() - PUBLISH_LEASE_MS).toISOString()
          )
        )
      ),
      orderBy: asc(jobs.requestedAt),
      limit: 25,
    });
    let count = 0;
    for (const job of due) {
      const claimed = await this.db
        .update(jobs)
        .set({ publishedAt: now.toISOString() })
        .where(
          and(
            eq(jobs.id, job.id),
            eq(jobs.generation, job.generation),
            job.publishedAt === null
              ? isNull(jobs.publishedAt)
              : eq(jobs.publishedAt, job.publishedAt)
          )
        )
        .returning({ id: jobs.id });
      if (!claimed.length) continue;
      // An uncertain confirm is retried after the publication lease; never erase a worker's completion.
      await publish({ jobId: job.id, generation: job.generation });
      count++;
    }
    return count;
  }

  async process(message: {
    jobId: string;
    generation: number;
  }): Promise<'complete' | 'obsolete' | 'retry' | 'failed'> {
    const now = new Date();
    const token = randomUUID();
    const claimed = await this.db.transaction(async (tx) => {
      const [job] = await tx
        .select()
        .from(jobs)
        .where(eq(jobs.id, message.jobId))
        .for('update');
      if (
        !job ||
        !isJobClaimable(job, job.generation, message.generation, now) ||
        job.desiredCalculatorVersion !== CALCULATOR_VERSION ||
        job.desiredFormatVersion !== CALCULATION_FORMAT_VERSION
      )
        return null;
      await tx
        .update(jobs)
        .set({
          status: 'processing',
          attempts: job.attempts + 1,
          leaseToken: token,
          leaseExpiresAt: new Date(now.getTime() + LEASE_MS).toISOString(),
        })
        .where(eq(jobs.id, job.id));
      return { ...job, attempts: job.attempts + 1 };
    });
    if (!claimed) return 'obsolete';
    const owns = and(
      eq(jobs.id, claimed.id),
      eq(jobs.generation, claimed.generation),
      eq(jobs.leaseToken, token)
    );
    const heartbeat = setInterval(() => {
      void this.db
        .update(jobs)
        .set({ leaseExpiresAt: new Date(Date.now() + LEASE_MS).toISOString() })
        .where(owns)
        .catch(() => undefined);
    }, 15_000);
    try {
      const beatmap = await this.db.query.beatmaps.findFirst({
        where: eq(beatmaps.id, claimed.beatmapId),
      });
      if (!beatmap) return 'obsolete';
      const currentSource =
        claimed.sourceFileId === null
          ? undefined
          : await this.db.query.beatmapFiles.findFirst({
              where: and(
                eq(beatmapFiles.id, claimed.sourceFileId),
                eq(beatmapFiles.provider, this.storage.provider)
              ),
            });
      const existing =
        currentSource ??
        (await this.db.query.beatmapFiles.findFirst({
          where: and(
            eq(beatmapFiles.beatmapId, beatmap.id),
            eq(beatmapFiles.provider, this.storage.provider)
          ),
          orderBy: (files, { desc }) => desc(files.acquiredAt),
        }));
      const file = await acquireBeatmapFile({
        osuBeatmapId: beatmap.osuId,
        storage: this.storage,
        downloader: this.downloader,
        existing: claimed.refreshSource ? undefined : (existing ?? undefined),
      });
      const settings = normalizeCalculationRequests(claimed.requestedSettings);
      const identity = (setting: (typeof settings)[number]) =>
        createCalculationIdentity({
          settings: setting,
          checksum: file.checksum,
          calculatorVersion: claimed.desiredCalculatorVersion,
          formatVersion: claimed.desiredFormatVersion,
        });
      const matchingSource =
        existing?.checksum === file.checksum
          ? existing
          : await this.db.query.beatmapFiles.findFirst({
              where: and(
                eq(beatmapFiles.beatmapId, beatmap.id),
                eq(beatmapFiles.provider, this.storage.provider),
                eq(beatmapFiles.checksum, file.checksum)
              ),
            });
      const cached = matchingSource
        ? await this.db.query.beatmapAttributes.findMany({
            where: and(
              eq(beatmapAttributes.beatmapId, beatmap.id),
              eq(beatmapAttributes.fileId, matchingSource.id),
              eq(beatmapAttributes.checksum, file.checksum),
              inArray(beatmapAttributes.identity, settings.map(identity))
            ),
          })
        : [];
      const pending = settings.filter(
        (setting) => !cached.some((row) => row.identity === identity(setting))
      );
      const calculated = pending.length
        ? await this.calculate(file.bytes, pending)
        : null;
      if (calculated) {
        const returned = normalizeCalculationRequests(
          calculated.results.map((value) => value.settings)
        );
        if (
          calculated.results.length !== pending.length ||
          JSON.stringify(returned) !== JSON.stringify(pending)
        ) {
          throw new Error('Calculator returned an incomplete profile batch');
        }
        for (const value of calculated.results) {
          CalculatedBeatmapAttributesSchema.parse(value.attributes);
          if (
            value.attributes.clockRate !== value.settings.clockRate ||
            value.attributes.difficulty.mode !== value.settings.mode ||
            calculated.sourceMode !== value.settings.mode ||
            calculated.keyCount !== value.attributes.difficulty.keyCount
          ) {
            throw new Error(
              'Calculator settings do not match the requested source and profile'
            );
          }
        }
      }
      const result = await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(jobs)
          .where(owns)
          .for('update');
        if (!current) return 'obsolete' as const;
        const sourceValues = {
          beatmapId: beatmap.id,
          provider: this.storage.provider,
          storageKey: file.storageKey,
          checksum: file.checksum,
          byteLength: file.byteLength,
          osuBeatmapId: beatmap.osuId,
          sourceUrl: `https://osu.ppy.sh/osu/${beatmap.osuId}`,
          sourceMode:
            calculated?.sourceMode ??
            matchingSource?.sourceMode ??
            settings[0].mode,
          keyCount: calculated?.keyCount ?? matchingSource?.keyCount ?? null,
        };
        await tx
          .insert(beatmapFiles)
          .values(sourceValues)
          .onConflictDoNothing();
        const source = await tx.query.beatmapFiles.findFirst({
          where: and(
            eq(beatmapFiles.beatmapId, beatmap.id),
            eq(beatmapFiles.provider, this.storage.provider),
            eq(beatmapFiles.checksum, file.checksum)
          ),
        });
        if (!source) throw new Error('Missing acquired file record');
        for (const value of calculated?.results ?? []) {
          await tx
            .insert(beatmapAttributes)
            .values({
              ...value.attributes,
              beatmapId: beatmap.id,
              fileId: source.id,
              checksum: file.checksum,
              identity: identity(value.settings),
              settings: value.settings,
              ruleset: value.settings.ruleset,
              mods: value.settings.mods,
              calculatorVersion: claimed.desiredCalculatorVersion,
              formatVersion: claimed.desiredFormatVersion,
            })
            .onConflictDoNothing();
        }
        await tx
          .update(jobs)
          .set({
            status: 'complete',
            sourceFileId: source.id,
            refreshSource: false,
            leaseToken: null,
            leaseExpiresAt: null,
            errorCode: null,
          })
          .where(owns);
        return 'complete' as const;
      });
      return result;
    } catch (error) {
      const retryable =
        typeof error === 'object' && error !== null && 'retryable' in error
          ? error.retryable === true
          : true;
      const delay = retryable ? retryDelayMs(claimed.attempts) : null;
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof error.code === 'string' &&
        /^[a-z_]{1,80}$/.test(error.code)
          ? error.code
          : 'processing_failed';
      await this.db
        .update(jobs)
        .set({
          status: delay === null ? 'failed' : 'pending',
          nextAttemptAt: new Date(Date.now() + (delay ?? 0)).toISOString(),
          leaseToken: null,
          leaseExpiresAt: null,
          publishedAt: null,
          errorCode: code,
        })
        .where(owns);
      return delay === null ? 'failed' : 'retry';
    } finally {
      clearInterval(heartbeat);
    }
  }
}

export async function getBeatmapAttribute(
  db: DatabaseClient,
  beatmapId: number,
  input: CalculationSettingsInput
) {
  const job = await db.query.beatmapAttributeJobs.findFirst({
    where: eq(jobs.beatmapId, beatmapId),
    with: { sourceFile: true },
  });
  if (!job?.sourceFile) return undefined;
  const identity = createCalculationIdentity({
    settings: normalizeCalculationSettings(input),
    checksum: job.sourceFile.checksum,
    calculatorVersion: job.desiredCalculatorVersion,
    formatVersion: job.desiredFormatVersion,
  });
  return db.query.beatmapAttributes.findFirst({
    where: and(
      eq(beatmapAttributes.beatmapId, beatmapId),
      eq(beatmapAttributes.fileId, job.sourceFile.id),
      eq(beatmapAttributes.identity, identity)
    ),
  });
}

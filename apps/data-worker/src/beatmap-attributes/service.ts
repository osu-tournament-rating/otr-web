import { randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
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

class ObsoleteJobError extends Error {}

export type AttributeIntentExecutor = Pick<
  DatabaseClient,
  'select' | 'query' | 'insert' | 'update'
>;

interface AttributeIntentOptions {
  settings?: CalculationSettingsInput[];
  recalculate?: boolean;
  refreshSource?: boolean;
}

export async function scheduleBeatmapAttributes(
  db: DatabaseClient,
  beatmapId: number,
  options: AttributeIntentOptions = {}
) {
  return db.transaction((tx) =>
    recordBeatmapAttributeIntent(tx, beatmapId, options)
  );
}

/** Call inside the metadata transaction so queue publication can recover from its durable intent. */
export async function recordBeatmapAttributeIntent(
  tx: AttributeIntentExecutor,
  beatmapId: number,
  options: AttributeIntentOptions = {}
) {
  const [beatmap] = await tx
    .select()
    .from(beatmaps)
    .where(eq(beatmaps.id, beatmapId))
    .for('update');
  if (!beatmap) throw new Error('Beatmap does not exist');
  const [previous] = await tx
    .select()
    .from(jobs)
    .where(eq(jobs.beatmapId, beatmapId))
    .for('update');
  const differentVersion =
    previous &&
    (previous.desiredCalculatorVersion !== CALCULATOR_VERSION ||
      previous.desiredFormatVersion !== CALCULATION_FORMAT_VERSION);
  if (differentVersion && options.settings && !options.recalculate)
    throw new Error(
      'Explicit recalculation is required to change calculator version'
    );
  const requested = options.settings
    ? normalizeCalculationRequests(options.settings)
    : previous && !options.recalculate
      ? previous.requestedSettings
      : getDefaultCalculationSettings(beatmap.ruleset);
  const settings =
    previous &&
    options.settings &&
    !options.recalculate &&
    previous.requestedSettings[0]?.ruleset === requested[0]?.ruleset
      ? normalizeCalculationRequests([
          ...previous.requestedSettings,
          ...requested,
        ])
      : requested;
  const values = {
    beatmapId,
    requestedSettings: settings,
    refreshSource: Boolean(options.refreshSource || previous?.refreshSource),
    desiredCalculatorVersion:
      previous && !options.recalculate
        ? previous.desiredCalculatorVersion
        : CALCULATOR_VERSION,
    desiredFormatVersion:
      previous && !options.recalculate
        ? previous.desiredFormatVersion
        : CALCULATION_FORMAT_VERSION,
  };
  if (!previous) {
    await tx.insert(jobs).values({ id: randomUUID(), ...values });
  } else if (
    options.recalculate ||
    options.refreshSource ||
    JSON.stringify(settings) !== JSON.stringify(previous.requestedSettings)
  ) {
    let acquiredFileId = previous.acquiredFileId;
    if (acquiredFileId !== null) {
      const abandoned = await tx
        .update(beatmapFiles)
        .set({
          fetchStatus: DataFetchStatus.Error,
          errorCode: 'obsolete_generation',
        })
        .where(
          and(
            eq(beatmapFiles.id, acquiredFileId),
            eq(beatmapFiles.fetchStatus, DataFetchStatus.Fetching)
          )
        )
        .returning({ id: beatmapFiles.id });
      if (options.refreshSource || abandoned.length) acquiredFileId = null;
    }
    const now = new Date().toISOString();
    await tx
      .update(jobs)
      .set({
        ...values,
        acquiredFileId,
        generation: sql`${jobs.generation}+1`,
        status: 'pending',
        attempts: 0,
        leaseToken: null,
        leaseExpiresAt: null,
        publishedAt: null,
        nextAttemptAt: now,
        requestedAt: now,
        errorCode: null,
      })
      .where(
        and(eq(jobs.id, previous.id), eq(jobs.generation, previous.generation))
      );
  }
  return tx.query.beatmapAttributeJobs.findFirst({
    where: eq(jobs.beatmapId, beatmapId),
  });
}

type FileRecord = typeof beatmapFiles.$inferSelect;
type FetchedFile = FileRecord & {
  checksum: string;
  storageKey: string;
  byteLength: number;
  acquiredAt: string;
};

function isFetchedFile(file: FileRecord | undefined): file is FetchedFile {
  return Boolean(
    file &&
    file.fetchStatus === DataFetchStatus.Fetched &&
    file.checksum &&
    file.storageKey &&
    file.byteLength !== null &&
    file.acquiredAt
  );
}

function errorCode(error: unknown): string {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    /^[a-z_]{1,80}$/.test(error.code)
    ? error.code
    : 'processing_failed';
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
    }) => Promise<unknown>
  ): Promise<number> {
    const now = new Date();
    await this.db.transaction(async (tx) => {
      const exhausted = await tx
        .update(jobs)
        .set({
          status: 'failed',
          leaseToken: null,
          leaseExpiresAt: null,
          errorCode: 'attempt_budget_exhausted',
        })
        .where(
          and(
            eq(jobs.desiredCalculatorVersion, CALCULATOR_VERSION),
            eq(jobs.desiredFormatVersion, CALCULATION_FORMAT_VERSION),
            eq(jobs.status, 'processing'),
            lte(jobs.leaseExpiresAt, now.toISOString()),
            sql`${jobs.attempts} >= ${MAX_ATTEMPTS}`
          )
        )
        .returning({ acquiredFileId: jobs.acquiredFileId });
      const fileIds = exhausted.flatMap((row) =>
        row.acquiredFileId === null ? [] : [row.acquiredFileId]
      );
      if (fileIds.length)
        await tx
          .update(beatmapFiles)
          .set({
            fetchStatus: DataFetchStatus.Error,
            errorCode: 'attempt_budget_exhausted',
          })
          .where(
            and(
              inArray(beatmapFiles.id, fileIds),
              eq(beatmapFiles.fetchStatus, DataFetchStatus.Fetching)
            )
          );
    });
    const due = await this.db.query.beatmapAttributeJobs.findMany({
      where: and(
        eq(jobs.desiredCalculatorVersion, CALCULATOR_VERSION),
        eq(jobs.desiredFormatVersion, CALCULATION_FORMAT_VERSION),
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
    let attemptFileId: number | undefined;
    let lastFetchAttempt: string | undefined;
    try {
      const beatmap = await this.db.query.beatmaps.findFirst({
        where: eq(beatmaps.id, claimed.beatmapId),
      });
      if (!beatmap) return 'obsolete';
      const boundId =
        claimed.acquiredFileId ??
        (claimed.refreshSource ? null : claimed.sourceFileId);
      const bound =
        boundId === null
          ? undefined
          : await this.db.query.beatmapFiles.findFirst({
              where: eq(beatmapFiles.id, boundId),
            });
      const candidate =
        bound?.provider === this.storage.provider
          ? bound
          : isFetchedFile(bound)
            ? await this.db.query.beatmapFiles.findFirst({
                where: and(
                  eq(beatmapFiles.beatmapId, beatmap.id),
                  eq(beatmapFiles.provider, this.storage.provider),
                  eq(beatmapFiles.checksum, bound.checksum),
                  eq(beatmapFiles.fetchStatus, DataFetchStatus.Fetched)
                ),
              })
            : undefined;
      const existing = isFetchedFile(candidate) ? candidate : undefined;
      const file = await acquireBeatmapFile({
        osuBeatmapId: beatmap.osuId,
        storage: this.storage,
        downloader: this.downloader,
        existing,
        beforeDownload: async () => {
          await this.db.transaction(async (tx) => {
            const [current] = await tx
              .select()
              .from(jobs)
              .where(owns)
              .for('update');
            if (!current) throw new ObsoleteJobError();
            lastFetchAttempt = new Date().toISOString();
            const values = {
              fetchStatus: DataFetchStatus.Fetching,
              lastFetchAttempt,
              errorCode: null,
            };
            if (candidate && !isFetchedFile(candidate)) {
              attemptFileId = candidate.id;
              await tx
                .update(beatmapFiles)
                .set(values)
                .where(eq(beatmapFiles.id, candidate.id));
            } else {
              const [attempt] = await tx
                .insert(beatmapFiles)
                .values({
                  ...values,
                  beatmapId: beatmap.id,
                  osuBeatmapId: beatmap.osuId,
                  provider: this.storage.provider,
                  sourceUrl: `https://osu.ppy.sh/osu/${beatmap.osuId}`,
                })
                .returning();
              attemptFileId = attempt.id;
            }
            await tx
              .update(jobs)
              .set({ acquiredFileId: attemptFileId })
              .where(owns);
          });
        },
      });
      const source = await this.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(jobs)
          .where(owns)
          .for('update');
        if (!current) throw new ObsoleteJobError();
        let stored = await tx.query.beatmapFiles.findFirst({
          where: and(
            eq(beatmapFiles.beatmapId, beatmap.id),
            eq(beatmapFiles.provider, this.storage.provider),
            eq(beatmapFiles.checksum, file.checksum),
            eq(beatmapFiles.fetchStatus, DataFetchStatus.Fetched)
          ),
        });
        if (stored) {
          if (attemptFileId !== undefined) {
            await tx
              .update(beatmapFiles)
              .set({ lastFetchAttempt })
              .where(eq(beatmapFiles.id, stored.id));
            await tx
              .update(jobs)
              .set({ acquiredFileId: stored.id })
              .where(owns);
            await tx
              .delete(beatmapFiles)
              .where(eq(beatmapFiles.id, attemptFileId));
            attemptFileId = undefined;
          }
        } else {
          if (attemptFileId === undefined)
            throw new Error('Missing file acquisition attempt');
          [stored] = await tx
            .update(beatmapFiles)
            .set({
              fetchStatus: DataFetchStatus.Fetched,
              checksum: file.checksum,
              storageKey: file.storageKey,
              byteLength: file.byteLength,
              acquiredAt: new Date().toISOString(),
              errorCode: null,
            })
            .where(eq(beatmapFiles.id, attemptFileId))
            .returning();
        }
        if (!isFetchedFile(stored))
          throw new Error('Missing fetched file provenance');
        await tx.update(jobs).set({ acquiredFileId: stored.id }).where(owns);
        return stored;
      });
      const settings = normalizeCalculationRequests(claimed.requestedSettings);
      const identity = (setting: (typeof settings)[number]) =>
        createCalculationIdentity({
          settings: setting,
          checksum: file.checksum,
          calculatorVersion: claimed.desiredCalculatorVersion,
          formatVersion: claimed.desiredFormatVersion,
        });
      const cached = await this.db.query.beatmapAttributes.findMany({
        where: and(
          eq(beatmapAttributes.beatmapId, beatmap.id),
          eq(beatmapAttributes.fileId, source.id),
          eq(beatmapAttributes.checksum, file.checksum),
          inArray(beatmapAttributes.identity, settings.map(identity))
        ),
      });
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
            calculated.sourceMode !== value.settings.mode ||
            (value.settings.ruleset === 4 && calculated.keyCount !== 4) ||
            (value.settings.ruleset === 5 && calculated.keyCount !== 7)
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
        if (calculated)
          await tx
            .update(beatmapFiles)
            .set({
              sourceMode: calculated.sourceMode,
              keyCount: calculated.keyCount,
            })
            .where(eq(beatmapFiles.id, source.id));
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
      if (error instanceof ObsoleteJobError) return 'obsolete';
      const retryable =
        typeof error === 'object' && error !== null && 'retryable' in error
          ? error.retryable === true
          : true;
      const delay = retryable ? retryDelayMs(claimed.attempts) : null;
      const retryNotBefore =
        typeof error === 'object' &&
        error !== null &&
        'retryNotBefore' in error &&
        error.retryNotBefore instanceof Date &&
        Number.isFinite(error.retryNotBefore.getTime())
          ? error.retryNotBefore.getTime()
          : 0;
      const nextAttemptAt = Math.max(
        Date.now() + (delay ?? 0),
        delay === null ? 0 : retryNotBefore
      );
      const code = errorCode(error);
      return this.db.transaction(async (tx) => {
        const [current] = await tx
          .select()
          .from(jobs)
          .where(owns)
          .for('update');
        if (!current) return 'obsolete' as const;
        if (attemptFileId !== undefined)
          await tx
            .update(beatmapFiles)
            .set({
              fetchStatus:
                code === 'not_found'
                  ? DataFetchStatus.NotFound
                  : DataFetchStatus.Error,
              errorCode: code,
            })
            .where(
              and(
                eq(beatmapFiles.id, attemptFileId),
                eq(beatmapFiles.fetchStatus, DataFetchStatus.Fetching)
              )
            );
        await tx
          .update(jobs)
          .set({
            status: delay === null ? 'failed' : 'pending',
            // PostgreSQL accepts extended positive years without JavaScript's leading '+'.
            nextAttemptAt: new Date(nextAttemptAt)
              .toISOString()
              .replace(/^\+/, ''),
            leaseToken: null,
            leaseExpiresAt: null,
            publishedAt: null,
            errorCode: code,
          })
          .where(owns);
        return delay === null ? ('failed' as const) : ('retry' as const);
      });
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
  const source = job?.sourceFile;
  if (!job || !source || !isFetchedFile(source)) return undefined;
  const identity = createCalculationIdentity({
    settings: normalizeCalculationSettings(input),
    checksum: source.checksum,
    calculatorVersion: job.desiredCalculatorVersion,
    formatVersion: job.desiredFormatVersion,
  });
  return db.query.beatmapAttributes.findFirst({
    where: and(
      eq(beatmapAttributes.beatmapId, beatmapId),
      eq(beatmapAttributes.fileId, source.id),
      eq(beatmapAttributes.identity, identity)
    ),
  });
}

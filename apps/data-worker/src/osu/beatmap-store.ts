import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '../db';
import * as schema from '@otr/core/db/schema';
import { Ruleset } from '@otr/core/osu/enums';
import { Storage } from '@google-cloud/storage';
import type { Logger } from '../logging/logger';
import type { RateLimiter } from '../rate-limiter';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { gzipSync, gunzipSync, file as localFile } from 'bun';

type QueryExecutor = Pick<DatabaseClient, 'query' | 'insert' | 'update'>;
type UpdateExecutor = Pick<DatabaseClient, 'update'>;

interface BeatmapRecord {
  id: number;
  dataFetchStatus: number;
}

export interface BeatmapStorage {
  /**
   * Gets a beatmap file from storage.
   * @param osuBeatmapId Beatmap id.
   * @returns Beatmap file data. If the file could not be downloaded, the buffer will be empty.
   */
  get(osuBeatmapId: number): Promise<Uint8Array<ArrayBuffer>>;

  /**
   * Stores a beatmap file.
   * @param osuBeatmapId Beatmap id.
   * @param data Beatmap file data.
   */
  store(osuBeatmapId: number, data: Uint8Array<ArrayBuffer>): Promise<void>;

  /**
   * Checks for the existence of a beatmap file.
   * @param osuBeatmapId Beatmap id.
   */
  exists(osuBeatmapId: number): Promise<boolean>;
}

interface BeatmapStorageBaseOptions {
  rateLimiter: RateLimiter;
  logger: Logger;
}

export interface GcsBeatmapStorageOptions extends BeatmapStorageBaseOptions {
  bucketName: string;
}

export interface LocalBeatmapStorageOptions extends BeatmapStorageBaseOptions {
  directory: string;
}

export type BeatmapStorageCreationOptions = BeatmapStorageBaseOptions & {
  bucketName?: string;
  directory: string;
};

export const ensureBeatmapPlaceholder = async (
  db: QueryExecutor,
  osuBeatmapId: number,
  status: number,
  updatedIso: string
): Promise<BeatmapRecord> => {
  const existing = await db.query.beatmaps.findFirst({
    where: eq(schema.beatmaps.osuId, osuBeatmapId),
    columns: {
      id: true,
      dataFetchStatus: true,
    },
  });

  if (existing) {
    return existing;
  }

  const [inserted] = await db
    .insert(schema.beatmaps)
    .values({
      osuId: osuBeatmapId,
      ruleset: Ruleset.Osu,
      rankedStatus: 0,
      diffName: 'Pending fetch',
      totalLength: 0,
      drainLength: 0,
      bpm: 0,
      countCircle: 0,
      countSlider: 0,
      countSpinner: 0,
      cs: 0,
      hp: 0,
      od: 0,
      ar: 0,
      sr: 0,
      maxCombo: null,
      beatmapsetId: null,
      dataFetchStatus: status,
      updated: updatedIso,
    })
    .onConflictDoNothing()
    .returning({
      id: schema.beatmaps.id,
      dataFetchStatus: schema.beatmaps.dataFetchStatus,
    });

  if (inserted) {
    return inserted;
  }

  const fallback = await db.query.beatmaps.findFirst({
    where: eq(schema.beatmaps.osuId, osuBeatmapId),
    columns: {
      id: true,
      dataFetchStatus: true,
    },
  });

  if (!fallback) {
    throw new Error('Failed to upsert beatmap placeholder');
  }

  return fallback;
};

export const updateBeatmapStatus = async (
  db: UpdateExecutor,
  beatmapId: number,
  status: number,
  updatedIso: string
) => {
  await db
    .update(schema.beatmaps)
    .set({
      dataFetchStatus: status,
      updated: updatedIso,
    })
    .where(eq(schema.beatmaps.id, beatmapId));
};

// #region Beatmap file storage

export const beatmapFilename = (osuBeatmapId: number) =>
  `${osuBeatmapId}.osu.gz`;

abstract class BeatmapStorageBase implements BeatmapStorage {
  private readonly rateLimiter: RateLimiter;
  private readonly logger: Logger;

  constructor({ rateLimiter, logger }: BeatmapStorageBaseOptions) {
    this.rateLimiter = rateLimiter;
    this.logger = logger;
  }

  /**
   * Downloads a beatmap file from osu!
   * @param osuBeatmapId Beatmap id.
   * @returns Beatmap file data. If download was unsuccessful, the buffer will be empty.
   */
  protected async download(
    osuBeatmapId: number
  ): Promise<Uint8Array<ArrayBuffer>> {
    return await this.rateLimiter.schedule(async () => {
      const response = await fetch(`https://osu.ppy.sh/osu/${osuBeatmapId}`);

      if (response.status === 404) {
        this.logger.warn('Beatmap file not found', {
          osuBeatmapId,
        });
        return new Uint8Array();
      }

      if (!response.ok) {
        this.logger.error('Failed to download beatmap file', {
          osuBeatmapId,
          status: response.status,
        });
        return new Uint8Array();
      }

      return new Uint8Array(await response.arrayBuffer());
    });
  }

  abstract get(osuBeatmapId: number): Promise<Uint8Array<ArrayBuffer>>;

  abstract store(
    osuBeatmapId: number,
    data: Uint8Array<ArrayBuffer>
  ): Promise<void>;

  abstract exists(osuBeatmapId: number): Promise<boolean>;
}

export class GcsBeatmapStorage extends BeatmapStorageBase {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor({ bucketName, ...base }: GcsBeatmapStorageOptions) {
    super(base);
    this.bucketName = bucketName;
    this.storage = new Storage();
  }

  /**
   * Creates an instance of {@link GcsBeatmapStorage} and ensures access to the target GCS bucket.
   * @param options Beatmap storage options.
   * @returns An instance of {@link GcsBeatmapStorage}.
   */
  static async create(
    options: GcsBeatmapStorageOptions
  ): Promise<GcsBeatmapStorage> {
    const instance = new GcsBeatmapStorage(options);
    let exists = false;

    try {
      [exists] = await instance.storage.bucket(options.bucketName).exists();
    } catch {
      throw new Error(
        `Could not access GCS bucket. Check the GOOGLE_APPLICATION_CREDENTIALS environment variable.`
      );
    }

    if (!exists) {
      throw new Error(
        `GCS bucket "${options.bucketName}" does not exist or is inaccessible.`
      );
    }

    return instance;
  }

  async get(osuBeatmapId: number): Promise<Uint8Array<ArrayBuffer>> {
    const file = this.storage
      .bucket(this.bucketName)
      .file(beatmapFilename(osuBeatmapId));
    const [exists] = await file.exists();

    // Download and store
    if (!exists) {
      const downloaded = await this.download(osuBeatmapId);
      await this.store(osuBeatmapId, downloaded);

      return downloaded;
    }

    // Download and decompress beatmap file
    const [data] = await file.download();
    return gunzipSync(new Uint8Array(data));
  }

  async store(
    osuBeatmapId: number,
    data: Uint8Array<ArrayBuffer>
  ): Promise<void> {
    // Compress before storing
    const compressed = gzipSync(data);

    await this.storage
      .bucket(this.bucketName)
      .file(beatmapFilename(osuBeatmapId))
      .save(compressed, {
        contentType: 'application/gzip',
      });
  }

  async exists(osuBeatmapId: number): Promise<boolean> {
    const [exists] = await this.storage
      .bucket(this.bucketName)
      .file(beatmapFilename(osuBeatmapId))
      .exists();

    return exists;
  }
}

export class LocalBeatmapStorage extends BeatmapStorageBase {
  private readonly directory: string;

  constructor({ directory, ...base }: LocalBeatmapStorageOptions) {
    super(base);
    this.directory = directory;
  }

  private filepath(osuBeatmapId: number) {
    return join(this.directory, beatmapFilename(osuBeatmapId));
  }

  async get(osuBeatmapId: number): Promise<Uint8Array<ArrayBuffer>> {
    const file = localFile(this.filepath(osuBeatmapId));

    // Download and store
    if (!(await file.exists())) {
      const downloaded = await this.download(osuBeatmapId);
      await this.store(osuBeatmapId, downloaded);

      return downloaded;
    }

    // Decompress file data before returning
    return Bun.gunzipSync(await file.arrayBuffer());
  }

  async store(
    osuBeatmapId: number,
    data: Uint8Array<ArrayBuffer>
  ): Promise<void> {
    // Ensure local storage dir
    mkdirSync(this.directory, { recursive: true });

    // Compress with gzip and store
    await Bun.write(this.filepath(osuBeatmapId), Bun.gzipSync(data));
  }

  async exists(osuBeatmapId: number): Promise<boolean> {
    return localFile(this.filepath(osuBeatmapId)).exists();
  }
}

/**
 * Creates an instance of a {@link BeatmapStorage} implementation based on provided options.
 *
 * If {@link BeatmapStorageCreationOptions#bucketName} is provided, an instance of {@link GcsBeatmapStorage} will
 * be created if possible. If not, an instance of {@link LocalBeatmapStorage} will be created as a fallback.
 */
export async function createBeatmapStorage({
  rateLimiter,
  logger,
  bucketName,
  directory,
}: BeatmapStorageCreationOptions): Promise<BeatmapStorage> {
  if (bucketName) {
    try {
      const storage = await GcsBeatmapStorage.create({
        bucketName,
        logger,
        rateLimiter,
      });
      logger.info('Using GCS beatmap storage', { bucketName });
      return storage;
    } catch (error) {
      logger.warn('GCS storage unavailable, falling back to local storage', {
        error,
        directory,
      });
    }
  }

  logger.info('Using local beatmap storage', { directory });
  return new LocalBeatmapStorage({ directory, logger, rateLimiter });
}

// #endregion

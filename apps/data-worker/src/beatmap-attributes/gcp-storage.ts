import type { Bucket } from '@google-cloud/storage';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
  BEATMAP_FILE_TIMEOUT_MS,
  BeatmapFileAcquisitionError,
  type BeatmapFileStorage,
  checksumFromStorageKey,
  type GcpServiceAccountCredentials,
  readBoundedBeatmapBytes,
  TransientBeatmapFileError,
  validateStoredBeatmapBytes,
  withBeatmapFileDeadline,
} from './storage';

function hasStatus(error: unknown, status: number): boolean {
  return Boolean(
    error &&
    typeof error === 'object' &&
    'code' in error &&
    Number(error.code) === status
  );
}

export type GcpBucketClient = Pick<Bucket, 'file' | 'getFiles'>;

export interface GcpBeatmapFileStorageOptions {
  /** Service account key. Absent means ambient credentials. */
  credentials?: GcpServiceAccountCredentials;
  /** Custom API endpoint for a local emulator in tests. */
  endpoint?: string;
  bucket?: GcpBucketClient;
}

export class GcpBeatmapFileStorage implements BeatmapFileStorage {
  readonly provider = 'gcp' as const;
  private readonly bucket: GcpBucketClient;

  constructor(
    private readonly bucketName: string,
    options: GcpBeatmapFileStorageOptions = {}
  ) {
    if (!bucketName.trim())
      throw new Error('GCP beatmap storage requires a bucket');
    this.bucket =
      options.bucket ??
      new Storage({
        retryOptions: { autoRetry: false },
        ...(options.credentials ? { credentials: options.credentials } : {}),
        ...(options.endpoint ? { apiEndpoint: options.endpoint } : {}),
      }).bucket(bucketName);
  }

  async verifyAccess(): Promise<void> {
    try {
      await withBeatmapFileDeadline(() =>
        this.bucket.getFiles({
          prefix: 'sha256/',
          maxResults: 1,
          autoPaginate: false,
        })
      );
    } catch (cause) {
      const bucket = `GCP beatmap bucket "${this.bucketName}"`;
      if (hasStatus(cause, 404)) throw new Error(`${bucket} does not exist`);
      if (hasStatus(cause, 403))
        throw new Error(
          `${bucket} denied access; grant the service account object read, create, and list permissions`
        );
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw new Error(`${bucket} check failed: ${reason}`);
    }
  }

  async get(key: string): Promise<Uint8Array | null> {
    checksumFromStorageKey(key);
    try {
      return await withBeatmapFileDeadline(async (signal) => {
        const stream = this.bucket
          .file(key)
          .createReadStream({ validation: 'crc32c', decompress: false });
        const bytes = await readBoundedBeatmapBytes(
          Readable.toWeb(stream),
          signal
        );
        validateStoredBeatmapBytes(key, bytes);
        return bytes;
      });
    } catch (cause) {
      if (hasStatus(cause, 404)) return null;
      if (cause instanceof BeatmapFileAcquisitionError) throw cause;
      throw new TransientBeatmapFileError(
        'storage_unavailable',
        'GCP beatmap storage read failed',
        { cause }
      );
    }
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    validateStoredBeatmapBytes(key, bytes);
    try {
      await withBeatmapFileDeadline(async (signal) => {
        const stream = this.bucket.file(key).createWriteStream({
          resumable: false,
          validation: 'crc32c',
          timeout: BEATMAP_FILE_TIMEOUT_MS,
          preconditionOpts: { ifGenerationMatch: 0 },
          metadata: {
            contentType: 'text/plain; charset=utf-8',
            metadata: { sha256: checksumFromStorageKey(key) },
          },
        });
        await pipeline(Readable.from([bytes]), stream, { signal });
      });
    } catch (cause) {
      if (hasStatus(cause, 412)) {
        const existing = await this.get(key);
        if (existing) return;
        throw new TransientBeatmapFileError(
          'storage_unavailable',
          'GCP beatmap disappeared after a concurrent upload'
        );
      }
      if (cause instanceof BeatmapFileAcquisitionError) throw cause;
      throw new TransientBeatmapFileError(
        'storage_unavailable',
        'GCP beatmap storage write failed',
        { cause }
      );
    }
  }
}

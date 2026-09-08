import type { Bucket } from '@google-cloud/storage';
import { Storage } from '@google-cloud/storage';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import {
  BEATMAP_FILE_TIMEOUT_MS,
  BeatmapFileAcquisitionError,
  type BeatmapFileStorage,
  checksumFromStorageKey,
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

export class GcpBeatmapFileStorage implements BeatmapFileStorage {
  readonly provider = 'gcp' as const;
  private readonly bucket: Pick<Bucket, 'file'>;

  constructor(bucketName: string, bucket?: Pick<Bucket, 'file'>) {
    if (!bucketName.trim())
      throw new Error('GCP beatmap storage requires a bucket');
    this.bucket =
      bucket ??
      new Storage({ retryOptions: { autoRetry: false } }).bucket(bucketName);
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

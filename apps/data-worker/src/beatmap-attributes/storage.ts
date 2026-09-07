import { createHash, randomUUID } from 'node:crypto';
import { constants, createReadStream } from 'node:fs';
import { mkdir, open, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';

export const MAX_BEATMAP_FILE_BYTES = 8 * 1024 * 1024;
export const BEATMAP_FILE_TIMEOUT_MS = 20_000;
const DEFAULT_DOWNLOAD_CONCURRENCY = 2;
const MAX_DOWNLOAD_CONCURRENCY = 8;
const MAX_PENDING_DOWNLOADS = 256;
const STORAGE_KEY = /^sha256\/([a-f0-9]{2})\/([a-f0-9]{64})\.osu$/;

export type BeatmapFileErrorCode =
  | 'invalid_id'
  | 'invalid_key'
  | 'invalid_file'
  | 'checksum_mismatch'
  | 'too_large'
  | 'not_found'
  | 'download_unavailable'
  | 'storage_unavailable'
  | 'timeout'
  | 'busy';

export class BeatmapFileAcquisitionError extends Error {
  constructor(
    readonly code: BeatmapFileErrorCode,
    readonly retryable: boolean,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'BeatmapFileAcquisitionError';
  }
}

export class TerminalBeatmapFileError extends BeatmapFileAcquisitionError {
  constructor(
    code: BeatmapFileErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(code, false, message, options);
    this.name = 'TerminalBeatmapFileError';
  }
}

export class TransientBeatmapFileError extends BeatmapFileAcquisitionError {
  constructor(
    code: BeatmapFileErrorCode,
    message: string,
    options?: ErrorOptions
  ) {
    super(code, true, message, options);
    this.name = 'TransientBeatmapFileError';
  }
}

export interface BeatmapFileStorage {
  readonly provider: 'local' | 'gcp';
  get(key: string): Promise<Uint8Array | null>;
  put(key: string, bytes: Uint8Array): Promise<void>;
}

export function beatmapFileChecksum(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export function beatmapFileStorageKey(checksum: string): string {
  if (!/^[a-f0-9]{64}$/.test(checksum)) {
    throw new TerminalBeatmapFileError(
      'invalid_key',
      'Invalid beatmap checksum'
    );
  }
  return `sha256/${checksum.slice(0, 2)}/${checksum}.osu`;
}

export function checksumFromStorageKey(key: string): string {
  const match = STORAGE_KEY.exec(key);
  if (!match || match[1] !== match[2].slice(0, 2)) {
    throw new TerminalBeatmapFileError(
      'invalid_key',
      'Invalid beatmap storage key'
    );
  }
  return match[2];
}

export function validateStoredBeatmapBytes(
  key: string,
  bytes: Uint8Array
): void {
  const checksum = checksumFromStorageKey(key);
  if (bytes.byteLength > MAX_BEATMAP_FILE_BYTES) {
    throw new TerminalBeatmapFileError(
      'too_large',
      'Beatmap file exceeds 8 MiB'
    );
  }
  if (bytes.byteLength === 0) {
    throw new TerminalBeatmapFileError('invalid_file', 'Beatmap file is empty');
  }
  if (beatmapFileChecksum(bytes) !== checksum) {
    throw new TerminalBeatmapFileError(
      'checksum_mismatch',
      'Stored beatmap checksum does not match its key'
    );
  }
}

function validateOsuBeatmapId(osuBeatmapId: number): void {
  if (!Number.isSafeInteger(osuBeatmapId) || osuBeatmapId <= 0) {
    throw new TerminalBeatmapFileError('invalid_id', 'Invalid osu! beatmap ID');
  }
}

export function validateBeatmapFile(
  bytes: Uint8Array,
  osuBeatmapId: number
): void {
  validateOsuBeatmapId(osuBeatmapId);
  if (bytes.byteLength > MAX_BEATMAP_FILE_BYTES) {
    throw new TerminalBeatmapFileError(
      'too_large',
      'Beatmap file exceeds 8 MiB'
    );
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new TerminalBeatmapFileError(
      'invalid_file',
      'Beatmap file is not valid UTF-8',
      { cause }
    );
  }
  const lines = text.split(/\r?\n/);
  if (
    !/^osu file format v[1-9]\d*$/.test(lines[0]?.trim() ?? '') ||
    text.includes('\0')
  ) {
    throw new TerminalBeatmapFileError(
      'invalid_file',
      'Invalid osu! file header'
    );
  }
  let section = '';
  const sections = new Set<string>();
  const ids: string[] = [];
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (/^\[.*\]$/.test(line)) {
      section = line;
      sections.add(section);
    } else if (section === '[Metadata]' && /^BeatmapID\s*:/.test(line)) {
      ids.push(line.slice(line.indexOf(':') + 1).trim());
    }
  }
  if (
    ids.length !== 1 ||
    !/^\d+$/.test(ids[0]) ||
    Number(ids[0]) !== osuBeatmapId
  ) {
    throw new TerminalBeatmapFileError(
      'invalid_file',
      'Beatmap source ID does not match the requested map'
    );
  }
  if (
    ![
      '[General]',
      '[Metadata]',
      '[Difficulty]',
      '[TimingPoints]',
      '[HitObjects]',
    ].every((value) => sections.has(value))
  ) {
    throw new TerminalBeatmapFileError(
      'invalid_file',
      'Beatmap file is missing required sections'
    );
  }
}

export async function withBeatmapFileDeadline<T>(
  action: (signal: AbortSignal) => Promise<T>,
  timeoutMs = BEATMAP_FILE_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new TransientBeatmapFileError(
        'timeout',
        'Beatmap file operation timed out'
      );
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([action(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

export async function readBoundedBeatmapBytes(
  stream: ReadableStream<Uint8Array> | NodeReadableStream<Uint8Array>,
  signal: AbortSignal
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const abort = () => {
    void reader.cancel(signal.reason).catch(() => {});
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    signal.throwIfAborted();
    while (true) {
      const { done, value } = await reader.read();
      signal.throwIfAborted();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BEATMAP_FILE_BYTES) {
        throw new TerminalBeatmapFileError(
          'too_large',
          'Beatmap file exceeds 8 MiB'
        );
      }
      chunks.push(value);
    }
    const result = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  } finally {
    signal.removeEventListener('abort', abort);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function errorCode(error: unknown): unknown {
  return error && typeof error === 'object' && 'code' in error
    ? error.code
    : undefined;
}

export class LocalBeatmapFileStorage implements BeatmapFileStorage {
  readonly provider = 'local' as const;
  readonly directory: string;

  constructor(directory: string) {
    if (!directory.trim())
      throw new Error('Local beatmap storage requires a directory');
    this.directory = resolve(directory);
  }

  async get(key: string): Promise<Uint8Array | null> {
    checksumFromStorageKey(key);
    try {
      return await withBeatmapFileDeadline(async (signal) => {
        const handle = await open(
          join(this.directory, key),
          constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK
        );
        try {
          const stat = await handle.stat();
          if (!stat.isFile())
            throw new TerminalBeatmapFileError(
              'invalid_file',
              'Stored beatmap is not a regular file'
            );
          if (stat.size > MAX_BEATMAP_FILE_BYTES)
            throw new TerminalBeatmapFileError(
              'too_large',
              'Beatmap file exceeds 8 MiB'
            );
          const source = createReadStream('', {
            fd: handle.fd,
            autoClose: false,
            highWaterMark: 64 * 1024,
            signal,
          });
          const bytes = await readBoundedBeatmapBytes(
            Readable.toWeb(source),
            signal
          );
          validateStoredBeatmapBytes(key, bytes);
          return bytes;
        } finally {
          await handle.close();
        }
      });
    } catch (cause) {
      if (errorCode(cause) === 'ENOENT') return null;
      if (errorCode(cause) === 'ELOOP')
        throw new TerminalBeatmapFileError(
          'invalid_file',
          'Stored beatmap cannot be a symbolic link'
        );
      if (cause instanceof BeatmapFileAcquisitionError) throw cause;
      throw new TransientBeatmapFileError(
        'storage_unavailable',
        'Local beatmap storage read failed',
        { cause }
      );
    }
  }

  async put(key: string, bytes: Uint8Array): Promise<void> {
    validateStoredBeatmapBytes(key, bytes);
    try {
      if (await this.get(key)) return;
    } catch (error) {
      if (
        !(error instanceof BeatmapFileAcquisitionError) ||
        !['invalid_file', 'checksum_mismatch', 'too_large'].includes(error.code)
      )
        throw error;
    }
    const path = join(this.directory, key);
    const temporary = `${path}.${randomUUID()}.tmp`;
    try {
      await withBeatmapFileDeadline(async (signal) => {
        try {
          await mkdir(dirname(path), { recursive: true, mode: 0o700 });
          signal.throwIfAborted();
          const handle = await open(temporary, 'wx', 0o600);
          try {
            await handle.writeFile(bytes, { signal });
            await handle.sync();
          } finally {
            await handle.close();
          }
          signal.throwIfAborted();
          await rename(temporary, path);
        } finally {
          await rm(temporary, { force: true });
        }
      });
    } catch (cause) {
      if (cause instanceof BeatmapFileAcquisitionError) throw cause;
      throw new TransientBeatmapFileError(
        'storage_unavailable',
        'Local beatmap storage write failed',
        { cause }
      );
    }
  }
}

export type BeatmapFileStorageConfiguration =
  | { provider: 'local'; directory: string }
  | { provider: 'gcp'; bucket: string };

export async function createBeatmapFileStorage(
  configuration: BeatmapFileStorageConfiguration
): Promise<BeatmapFileStorage> {
  if (configuration.provider === 'local')
    return new LocalBeatmapFileStorage(configuration.directory);
  if (configuration.provider === 'gcp') {
    if (!configuration.bucket.trim())
      throw new Error('GCP beatmap storage requires a bucket');
    const { GcpBeatmapFileStorage } = await import('./gcp-storage');
    return new GcpBeatmapFileStorage(configuration.bucket);
  }
  throw new Error('Beatmap storage provider must be local or gcp');
}

type BeatmapFileFetch = (
  url: string,
  options?: RequestInit
) => Promise<Response>;

export class BeatmapFileDownloader {
  private readonly fetchFile: BeatmapFileFetch;
  private readonly concurrency: number;
  private readonly timeoutMs: number;
  private active = 0;
  private readonly waiting: Array<() => void> = [];
  private readonly pending = new Map<number, Promise<Uint8Array>>();

  constructor(
    options: {
      fetch?: BeatmapFileFetch;
      concurrency?: number;
      timeoutMs?: number;
    } = {}
  ) {
    this.fetchFile = options.fetch ?? fetch;
    this.concurrency = options.concurrency ?? DEFAULT_DOWNLOAD_CONCURRENCY;
    this.timeoutMs = options.timeoutMs ?? BEATMAP_FILE_TIMEOUT_MS;
    if (
      !Number.isInteger(this.concurrency) ||
      this.concurrency < 1 ||
      this.concurrency > MAX_DOWNLOAD_CONCURRENCY
    )
      throw new Error('Beatmap download concurrency must be between 1 and 8');
    if (
      !Number.isFinite(this.timeoutMs) ||
      this.timeoutMs <= 0 ||
      this.timeoutMs > 120_000
    )
      throw new Error(
        'Beatmap download timeout must be between 0 and 120000 milliseconds'
      );
  }

  async download(osuBeatmapId: number): Promise<Uint8Array> {
    validateOsuBeatmapId(osuBeatmapId);
    const existing = this.pending.get(osuBeatmapId);
    if (existing) return existing;
    if (this.pending.size >= MAX_PENDING_DOWNLOADS)
      throw new TransientBeatmapFileError(
        'busy',
        'Beatmap download capacity is full'
      );
    const job = this.downloadOnce(osuBeatmapId);
    this.pending.set(osuBeatmapId, job);
    try {
      return await job;
    } finally {
      this.pending.delete(osuBeatmapId);
    }
  }

  private async downloadOnce(osuBeatmapId: number): Promise<Uint8Array> {
    if (this.active >= this.concurrency)
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    else this.active++;
    try {
      return await withBeatmapFileDeadline(async (signal) => {
        const response = await this.fetchFile(
          `https://osu.ppy.sh/osu/${osuBeatmapId}`,
          { redirect: 'manual', signal }
        );
        try {
          if (response.status === 404 || response.status === 410)
            throw new TerminalBeatmapFileError(
              'not_found',
              'Beatmap file is unavailable upstream'
            );
          if (!response.ok || response.redirected) {
            const retryable =
              response.status === 403 ||
              response.status === 408 ||
              response.status === 429 ||
              response.status >= 500;
            throw new BeatmapFileAcquisitionError(
              'download_unavailable',
              retryable,
              `Beatmap download returned HTTP ${response.status}`
            );
          }
          if (
            /text\/html|application\/xhtml\+xml/i.test(
              response.headers.get('content-type') ?? ''
            )
          )
            throw new TerminalBeatmapFileError(
              'invalid_file',
              'Beatmap source returned HTML'
            );
          const length = response.headers.get('content-length');
          if (
            length !== null &&
            (!/^\d+$/.test(length) || Number(length) > MAX_BEATMAP_FILE_BYTES)
          )
            throw new TerminalBeatmapFileError(
              'too_large',
              'Invalid or excessive beatmap content length'
            );
          if (!response.body)
            throw new TerminalBeatmapFileError(
              'invalid_file',
              'Beatmap download is empty'
            );
          const bytes = await readBoundedBeatmapBytes(response.body, signal);
          validateBeatmapFile(bytes, osuBeatmapId);
          return bytes;
        } finally {
          if (!response.body?.locked)
            void response.body?.cancel().catch(() => {});
        }
      }, this.timeoutMs);
    } catch (cause) {
      if (cause instanceof BeatmapFileAcquisitionError) throw cause;
      throw new TransientBeatmapFileError(
        'download_unavailable',
        'Beatmap download failed',
        { cause }
      );
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    }
  }
}

export interface AcquiredBeatmapFile {
  bytes: Uint8Array;
  storageProvider: BeatmapFileStorage['provider'];
  storageKey: string;
  checksum: string;
  byteLength: number;
  reused: boolean;
}

export async function acquireBeatmapFile(options: {
  osuBeatmapId: number;
  storage: BeatmapFileStorage;
  downloader: Pick<BeatmapFileDownloader, 'download'>;
  existing?: {
    storageProvider?: BeatmapFileStorage['provider'];
    storageKey: string;
    checksum: string;
  } | null;
}): Promise<AcquiredBeatmapFile> {
  const { osuBeatmapId, storage, downloader, existing } = options;
  validateOsuBeatmapId(osuBeatmapId);
  if (
    existing &&
    (!existing.storageProvider || existing.storageProvider === storage.provider)
  ) {
    try {
      const bytes = await storage.get(existing.storageKey);
      if (bytes) {
        validateStoredBeatmapBytes(existing.storageKey, bytes);
        validateBeatmapFile(bytes, osuBeatmapId);
        if (beatmapFileChecksum(bytes) !== existing.checksum)
          throw new TerminalBeatmapFileError(
            'checksum_mismatch',
            'Beatmap file does not match stored provenance'
          );
        return {
          bytes,
          storageProvider: storage.provider,
          storageKey: existing.storageKey,
          checksum: existing.checksum,
          byteLength: bytes.byteLength,
          reused: true,
        };
      }
    } catch (error) {
      if (
        !(error instanceof BeatmapFileAcquisitionError) ||
        !['invalid_file', 'checksum_mismatch', 'too_large'].includes(error.code)
      )
        throw error;
    }
  }
  const bytes = await downloader.download(osuBeatmapId);
  validateBeatmapFile(bytes, osuBeatmapId);
  const checksum = beatmapFileChecksum(bytes);
  const storageKey = beatmapFileStorageKey(checksum);
  await storage.put(storageKey, bytes);
  return {
    bytes,
    storageProvider: storage.provider,
    storageKey,
    checksum,
    byteLength: bytes.byteLength,
    reused: false,
  };
}

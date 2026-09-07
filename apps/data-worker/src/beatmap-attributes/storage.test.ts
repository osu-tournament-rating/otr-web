import { afterEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import {
  mkdtemp,
  readdir,
  rm,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Writable } from 'node:stream';

import { GcpBeatmapFileStorage } from './gcp-storage';

import {
  acquireBeatmapFile,
  BeatmapFileDownloader,
  beatmapFileChecksum,
  beatmapFileStorageKey,
  createBeatmapFileStorage,
  LocalBeatmapFileStorage,
  MAX_BEATMAP_FILE_BYTES,
  validateBeatmapFile,
} from './storage';

const directories: string[] = [];
const fileBytes = new TextEncoder().encode(`osu file format v14
[General]
Mode:0
[Metadata]
BeatmapID:123
[Difficulty]
CircleSize:4
[TimingPoints]
0,500,4,2,0,100,1,0
[HitObjects]
64,64,1000,1,0,0:0:0:0:
`);

async function createStorage() {
  const directory = await mkdtemp(join(tmpdir(), 'otr-beatmap-storage-'));
  directories.push(directory);
  return new LocalBeatmapFileStorage(directory);
}

function mockDownloader(response: () => Response | Promise<Response>) {
  return new BeatmapFileDownloader({
    fetch: async () => response(),
  });
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true }))
  );
});

describe('local beatmap storage', () => {
  test('persists complete bytes at a checksum key and recovers a missing file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'otr-beatmap-storage-'));
    directories.push(directory);
    const storage = new LocalBeatmapFileStorage(directory);
    const checksum = createHash('sha256').update(fileBytes).digest('hex');
    const key = `sha256/${checksum.slice(0, 2)}/${checksum}.osu`;
    expect(await storage.get(key)).toBeNull();
    await storage.put(key, fileBytes);
    expect(await storage.get(key)).toEqual(fileBytes);
  });

  test('deduplicates concurrent atomic writes without temporary files remaining', async () => {
    const storage = await createStorage();
    const key = beatmapFileStorageKey(beatmapFileChecksum(fileBytes));
    await Promise.all(
      Array.from({ length: 12 }, () => storage.put(key, fileBytes))
    );
    expect(await storage.get(key)).toEqual(fileBytes);
    expect(
      await readdir(join(storage.directory, 'sha256', key.split('/')[1]))
    ).toEqual([key.split('/')[2]]);
  });

  test('rejects traversal, mismatched checksum, oversized files, and symlink reads', async () => {
    const storage = await createStorage();
    const key = beatmapFileStorageKey(beatmapFileChecksum(fileBytes));
    await expect(storage.get('../outside.osu')).rejects.toMatchObject({
      code: 'invalid_key',
      retryable: false,
    });
    await expect(storage.put(key, new Uint8Array([1]))).rejects.toMatchObject({
      code: 'checksum_mismatch',
      retryable: false,
    });
    await expect(
      storage.put(key, new Uint8Array(MAX_BEATMAP_FILE_BYTES + 1))
    ).rejects.toMatchObject({ code: 'too_large', retryable: false });
    await storage.put(key, fileBytes);
    await truncate(join(storage.directory, key), MAX_BEATMAP_FILE_BYTES + 1);
    await expect(storage.get(key)).rejects.toMatchObject({
      code: 'too_large',
      retryable: false,
    });
    await rm(join(storage.directory, key));
    const other = join(storage.directory, 'other.osu');
    await writeFile(other, fileBytes);
    await symlink(other, join(storage.directory, key));
    await expect(storage.get(key)).rejects.toMatchObject({
      code: 'invalid_file',
      retryable: false,
    });
  });

  test('local provider creation does not load GCP and invalid provider selection fails', async () => {
    const storage = await createStorage();
    expect(
      (
        await createBeatmapFileStorage({
          provider: 'local',
          directory: storage.directory,
        })
      ).provider
    ).toBe('local');
    await expect(
      createBeatmapFileStorage({ provider: 'gcp', bucket: '' })
    ).rejects.toThrow();
    // Runtime configuration must be checked even if it entered through untyped code.
    await expect(
      createBeatmapFileStorage({ provider: 's3' } as never)
    ).rejects.toThrow();
  });
});

describe('file validation and recovery', () => {
  test('validates source ID inside Metadata and accepts BOM and CRLF', () => {
    const text = new TextDecoder().decode(fileBytes);
    expect(() =>
      validateBeatmapFile(
        new TextEncoder().encode(`\uFEFF${text.replaceAll('\n', '\r\n')}`),
        123
      )
    ).not.toThrow();
    for (const invalid of [
      text.replace('BeatmapID:123', 'BeatmapID:456'),
      text.replace('BeatmapID:123', 'BeatmapID:123\nBeatmapID:456'),
      text.replace('[Metadata]', '[WrongSection]'),
      text.replace('osu file format v14', '<html>'),
      text.replace('[HitObjects]', '[MissingObjects]'),
    ]) {
      expect(() =>
        validateBeatmapFile(new TextEncoder().encode(invalid), 123)
      ).toThrow();
    }
    expect(() => validateBeatmapFile(new Uint8Array([0xff]), 123)).toThrow();
  });

  test('reuses profiles, reacquires missing/corrupt files, and retains new source provenance', async () => {
    const storage = await createStorage();
    let downloads = 0;
    let source = fileBytes;
    const downloader = mockDownloader(() => {
      downloads++;
      return new Response(source);
    });
    const first = await acquireBeatmapFile({
      osuBeatmapId: 123,
      storage,
      downloader,
    });
    expect(first).toMatchObject({
      storageProvider: 'local',
      checksum: beatmapFileChecksum(fileBytes),
      byteLength: fileBytes.length,
      reused: false,
    });
    expect(
      (
        await acquireBeatmapFile({
          osuBeatmapId: 123,
          storage,
          downloader,
          existing: first,
        })
      ).reused
    ).toBe(true);
    expect(downloads).toBe(1);
    await rm(join(storage.directory, first.storageKey));
    expect(
      (
        await acquireBeatmapFile({
          osuBeatmapId: 123,
          storage,
          downloader,
          existing: first,
        })
      ).reused
    ).toBe(false);
    expect(downloads).toBe(2);
    await writeFile(join(storage.directory, first.storageKey), 'corrupted');
    await acquireBeatmapFile({
      osuBeatmapId: 123,
      storage,
      downloader,
      existing: first,
    });
    expect(await storage.get(first.storageKey)).toEqual(fileBytes);
    expect(downloads).toBe(3);
    await rm(join(storage.directory, first.storageKey));
    source = new TextEncoder().encode(
      new TextDecoder()
        .decode(fileBytes)
        .replace('CircleSize:4', 'CircleSize:5')
    );
    const updated = await acquireBeatmapFile({
      osuBeatmapId: 123,
      storage,
      downloader,
      existing: first,
    });
    expect(updated.checksum).not.toBe(first.checksum);
    expect(updated.storageKey).not.toBe(first.storageKey);
  });

  test('does not download on an unavailable storage provider or use a mismatched provider cache', async () => {
    let downloads = 0;
    const downloader = mockDownloader(() => {
      downloads++;
      return new Response(fileBytes);
    });
    const storage = await createStorage();
    const original = storage.get.bind(storage);
    storage.get = async () => {
      throw new Error('provider unavailable');
    };
    await expect(
      acquireBeatmapFile({
        osuBeatmapId: 123,
        storage,
        downloader,
        existing: {
          checksum: beatmapFileChecksum(fileBytes),
          storageKey: beatmapFileStorageKey(beatmapFileChecksum(fileBytes)),
          storageProvider: 'local',
        },
      })
    ).rejects.toThrow('provider unavailable');
    expect(downloads).toBe(0);
    storage.get = original;
    const result = await acquireBeatmapFile({
      osuBeatmapId: 123,
      storage,
      downloader,
      existing: {
        checksum: beatmapFileChecksum(fileBytes),
        storageKey: beatmapFileStorageKey(beatmapFileChecksum(fileBytes)),
        storageProvider: 'gcp',
      },
    });
    expect(result.storageProvider).toBe('local');
    expect(result.reused).toBe(false);
    expect(downloads).toBe(1);
  });
});

describe('beatmap downloads', () => {
  test('rejects HTML from the source instead of accepting it as a beatmap', async () => {
    const downloader = new BeatmapFileDownloader({
      fetch: async () => new Response('<html>not a beatmap</html>'),
    });
    await expect(downloader.download(123)).rejects.toThrow();
  });

  test('uses a fixed HTTPS source, manual redirects, and a deadline signal', async () => {
    const downloader = new BeatmapFileDownloader({
      fetch: async (input, init) => {
        expect(input).toBe('https://osu.ppy.sh/osu/123');
        expect(init?.redirect).toBe('manual');
        expect(init?.signal).toBeInstanceOf(AbortSignal);
        return new Response(fileBytes);
      },
    });
    expect(await downloader.download(123)).toEqual(fileBytes);
    await expect(downloader.download(-1)).rejects.toMatchObject({
      code: 'invalid_id',
      retryable: false,
    });
  });

  test.each([
    [301, false],
    [404, false],
    [403, true],
    [429, true],
    [500, true],
  ])(
    'classifies HTTP %i for bounded caller retries',
    async (status, retryable) => {
      await expect(
        mockDownloader(() => new Response('no', { status })).download(123)
      ).rejects.toMatchObject({ retryable });
    }
  );

  test('bounds declared and streamed sizes, cancels rejected responses, and rejects empty files', async () => {
    let cancelled = false;
    const oversize = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_BEATMAP_FILE_BYTES));
        controller.enqueue(new Uint8Array(1));
      },
      cancel() {
        cancelled = true;
      },
    });
    await expect(
      mockDownloader(() => new Response(oversize)).download(123)
    ).rejects.toMatchObject({ code: 'too_large', retryable: false });
    expect(cancelled).toBe(true);
    await expect(
      mockDownloader(
        () =>
          new Response(fileBytes, {
            headers: { 'content-length': String(MAX_BEATMAP_FILE_BYTES + 1) },
          })
      ).download(123)
    ).rejects.toMatchObject({ code: 'too_large', retryable: false });
    await expect(
      mockDownloader(() => new Response(null)).download(123)
    ).rejects.toMatchObject({ retryable: false });
    await expect(
      mockDownloader(
        () =>
          new Response(fileBytes, { headers: { 'content-type': 'text/html' } })
      ).download(123)
    ).rejects.toMatchObject({ retryable: false });
  });

  test('interrupts a stalled response body and frees the concurrency slot', async () => {
    let cancelled = false;
    let calls = 0;
    const downloader = new BeatmapFileDownloader({
      timeoutMs: 15,
      concurrency: 1,
      fetch: async () => {
        calls++;
        if (calls > 1) return new Response(fileBytes);
        return new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          })
        );
      },
    });
    await expect(downloader.download(123)).rejects.toMatchObject({
      code: 'timeout',
      retryable: true,
    });
    expect(cancelled).toBe(true);
    expect(await downloader.download(123)).toEqual(fileBytes);
  });

  test('bounds simultaneous downloads and shares duplicate in-flight source requests', async () => {
    let active = 0;
    let peak = 0;
    let calls = 0;
    const downloader = new BeatmapFileDownloader({
      concurrency: 2,
      fetch: async (input) => {
        active++;
        calls++;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        const id = String(input).split('/').at(-1);
        return new Response(
          new TextDecoder()
            .decode(fileBytes)
            .replace('BeatmapID:123', `BeatmapID:${id}`)
        );
      },
    });
    await Promise.all(
      [123, 123, 123, 124, 125, 126].map((id) => downloader.download(id))
    );
    expect(peak).toBe(2);
    expect(calls).toBe(4);
  });
});

describe('GCP storage boundary with mocked SDK streams', () => {
  test('bounds and validates reads without fallback, and reports missing objects', async () => {
    let stream = () => Readable.from([fileBytes]);
    const storage = new GcpBeatmapFileStorage('test-only', {
      file: (() => ({ createReadStream: () => stream() })) as never,
    });
    const key = beatmapFileStorageKey(beatmapFileChecksum(fileBytes));
    expect(await storage.get(key)).toEqual(fileBytes);
    stream = () =>
      Readable.from([
        new Uint8Array(MAX_BEATMAP_FILE_BYTES),
        new Uint8Array(1),
      ]);
    await expect(storage.get(key)).rejects.toMatchObject({
      code: 'too_large',
      retryable: false,
    });
    stream = () =>
      Readable.from([
        Promise.reject(Object.assign(new Error('missing'), { code: 404 })),
      ]);
    expect(await storage.get(key)).toBeNull();
    stream = () =>
      Readable.from([
        Promise.reject(Object.assign(new Error('forbidden'), { code: 403 })),
      ]);
    await expect(storage.get(key)).rejects.toMatchObject({
      code: 'storage_unavailable',
      retryable: true,
    });
  });

  test('writes immutable checksum objects and verifies precondition-conflict contents', async () => {
    const key = beatmapFileStorageKey(beatmapFileChecksum(fileBytes));
    const stored: Uint8Array[] = [];
    let duplicate = false;
    let current = fileBytes;
    const storage = new GcpBeatmapFileStorage('test-only', {
      file: (() => ({
        createReadStream: () => Readable.from([current]),
        createWriteStream: (options: {
          preconditionOpts: { ifGenerationMatch: number };
          resumable: boolean;
          validation: string;
        }) => {
          expect(options.preconditionOpts.ifGenerationMatch).toBe(0);
          expect(options.resumable).toBe(false);
          expect(options.validation).toBe('crc32c');
          return new Writable({
            write(chunk, _encoding, callback) {
              if (duplicate)
                callback(
                  Object.assign(new Error('already exists'), { code: 412 })
                );
              else {
                stored.push(new Uint8Array(chunk));
                callback();
              }
            },
          });
        },
      })) as never,
    });
    await storage.put(key, fileBytes);
    expect(stored).toEqual([fileBytes]);
    duplicate = true;
    await storage.put(key, fileBytes);
    expect(stored).toHaveLength(1);
    current = new Uint8Array([1]);
    await expect(storage.put(key, fileBytes)).rejects.toMatchObject({
      code: 'checksum_mismatch',
      retryable: false,
    });
  });
});

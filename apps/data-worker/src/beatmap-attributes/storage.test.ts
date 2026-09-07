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
  BeatmapFileAcquisitionError,
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
      provider: 'local',
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

  test('records an acquisition intent before network and skips the intent for cached bytes', async () => {
    const storage = await createStorage();
    let intents = 0;
    let requests = 0;
    const downloader = mockDownloader(() => {
      expect(intents).toBe(1);
      requests++;
      return new Response(fileBytes);
    });
    const first = await acquireBeatmapFile({
      osuBeatmapId: 123,
      storage,
      downloader,
      beforeDownload: async () => {
        intents++;
      },
    });
    await acquireBeatmapFile({
      osuBeatmapId: 123,
      storage,
      downloader,
      existing: first,
      beforeDownload: async () => {
        intents++;
      },
    });
    expect(intents).toBe(1);
    expect(requests).toBe(1);
    await expect(
      acquireBeatmapFile({
        osuBeatmapId: 123,
        storage,
        downloader,
        beforeDownload: async () => {
          throw new Error('intent transaction failed');
        },
      })
    ).rejects.toThrow('intent transaction failed');
    expect(requests).toBe(1);
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
          provider: 'local',
        },
      })
    ).rejects.toThrow('provider unavailable');
    expect(downloads).toBe(0);
    storage.get = original;
    await storage.put(
      beatmapFileStorageKey(beatmapFileChecksum(fileBytes)),
      fileBytes
    );
    const result = await acquireBeatmapFile({
      osuBeatmapId: 123,
      storage,
      downloader,
      existing: {
        checksum: beatmapFileChecksum(fileBytes),
        storageKey: beatmapFileStorageKey(beatmapFileChecksum(fileBytes)),
        provider: 'gcp',
      },
    });
    expect(result.provider).toBe('local');
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

  test('a refreshed request does not share bytes from an older in-flight request', async () => {
    let releaseOlder!: () => void;
    const olderGate = new Promise<void>((resolve) => {
      releaseOlder = resolve;
    });
    const newerBytes = new TextEncoder().encode(
      new TextDecoder().decode(fileBytes) + '\n// refreshed source\n'
    );
    let requests = 0;
    const downloader = new BeatmapFileDownloader({
      concurrency: 2,
      fetch: async () => {
        requests++;
        if (requests === 1) {
          await olderGate;
          return new Response(fileBytes);
        }
        return new Response(newerBytes);
      },
    });
    const older = downloader.download(123);
    await Bun.sleep(0);
    let refreshedBytes: Uint8Array | undefined;
    const refreshed = downloader.download(123).then((bytes) => {
      refreshedBytes = bytes;
    });
    await Bun.sleep(0);
    try {
      expect(refreshedBytes).toEqual(newerBytes);
      expect(requests).toBe(2);
    } finally {
      releaseOlder();
      await Promise.all([older, refreshed]);
    }
    expect(await older).toEqual(fileBytes);
    expect(refreshedBytes).toEqual(newerBytes);
  });

  test('bounds all pending requests, including repeated IDs, and frees capacity after completion', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const clock = virtualClock();
    let requests = 0;
    const downloader = new BeatmapFileDownloader({
      ...clock,
      concurrency: 2,
      fetch: async () => {
        requests++;
        await gate;
        return new Response(fileBytes);
      },
    });
    const pending = Array.from({ length: 256 }, () => downloader.download(123));
    let overflowError: unknown;
    const overflow = downloader.download(123).catch((error) => {
      overflowError = error;
    });
    await Bun.sleep(0);
    try {
      expect(overflowError).toMatchObject({ code: 'busy', retryable: true });
      expect(requests).toBe(2);
    } finally {
      release();
      await Promise.all([...pending, overflow]);
    }
    expect(requests).toBe(256);
    expect(await downloader.download(123)).toEqual(fileBytes);
    expect(requests).toBe(257);
  });

  test('bounds simultaneous downloads while issuing independent requests for the same source', async () => {
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
    expect(calls).toBe(6);
  });
});

function virtualClock(start = 0) {
  let time = start;
  const waits: number[] = [];
  return {
    now: () => time,
    waits,
    sleep: async (milliseconds: number) => {
      waits.push(milliseconds);
      time += milliseconds;
    },
  };
}

function bytesForId(id: number) {
  return new TextEncoder().encode(
    new TextDecoder()
      .decode(fileBytes)
      .replace('BeatmapID:123', `BeatmapID:${id}`)
  );
}

describe('shared beatmap download throttling', () => {
  test('admits only sixty requests before the next minute', async () => {
    const clock = virtualClock();
    const started: number[] = [];
    const downloader = new BeatmapFileDownloader({
      ...clock,
      fetch: async (url) => {
        started.push(clock.now());
        return new Response(bytesForId(Number(url.split('/').at(-1))));
      },
    });
    for (let id = 1; id <= 61; id++) await downloader.download(id);
    expect(started.slice(0, 60)).toEqual(Array(60).fill(0));
    expect(started[60]).toBe(60_000);
    expect(clock.waits).toEqual([60_000]);
  });

  test.each([
    [null, 8_000],
    ['3', 8_000],
    ['20', 20_000],
    ['Mon, 07 Sep 2026 12:00:30 GMT', 30_000],
    ['Mon, 07 Sep 2026 11:59:30 GMT', 8_000],
    ['invalid', 8_000],
  ])(
    'honors exponential delay and Retry-After %s',
    async (header, expected) => {
      const start = Date.parse('2026-09-07T12:00:00Z');
      const clock = virtualClock(start);
      const started: number[] = [];
      const downloader = new BeatmapFileDownloader({
        ...clock,
        fetch: async () => {
          started.push(clock.now() - start);
          if (started.length === 1)
            return new Response('throttled', {
              status: 429,
              headers: header === null ? undefined : { 'Retry-After': header },
            });
          return new Response(fileBytes);
        },
      });
      expect(await downloader.download(123)).toEqual(fileBytes);
      expect(started).toEqual([0, expected]);
    }
  );

  test('exhausts five HTTP attempts with exponential cooldown retained for a later job attempt', async () => {
    const clock = virtualClock();
    const started: number[] = [];
    const downloader = new BeatmapFileDownloader({
      ...clock,
      fetch: async () => {
        started.push(clock.now());
        return new Response('throttled', { status: 429 });
      },
    });
    await expect(downloader.download(123)).rejects.toMatchObject({
      code: 'rate_limited',
      retryable: true,
      retryNotBefore: new Date(248_000),
    });
    expect(started).toEqual([0, 8_000, 24_000, 56_000, 120_000]);
  });

  test('bounds total acquisition time when slow responses consume the retry budget', async () => {
    const clock = virtualClock();
    const started: number[] = [];
    const downloader = new BeatmapFileDownloader({
      ...clock,
      fetch: async () => {
        started.push(clock.now());
        await clock.sleep(19_000);
        return new Response('throttled', { status: 429 });
      },
    });
    await expect(downloader.download(123)).rejects.toMatchObject({
      code: 'rate_limited',
      retryNotBefore: new Date(196_000),
    });
    expect(started).toEqual([0, 27_000, 62_000, 113_000]);
    expect(clock.now()).toBe(132_000);
  });

  test('returns only valid durable retry dates and never carries one on terminal errors', async () => {
    for (const retryNotBefore of [new Date(NaN), 'invalid' as never]) {
      expect(
        new BeatmapFileAcquisitionError('rate_limited', true, 'throttled', {
          retryNotBefore,
        }).retryNotBefore
      ).toBeUndefined();
    }
    expect(
      new BeatmapFileAcquisitionError('not_found', false, 'missing', {
        retryNotBefore: new Date(0),
      }).retryNotBefore
    ).toBeUndefined();
    const clock = virtualClock();
    const downloader = new BeatmapFileDownloader({
      ...clock,
      fetch: async () =>
        new Response('throttled', {
          status: 429,
          headers: { 'Retry-After': '9'.repeat(400) },
        }),
    });
    await expect(downloader.download(123)).rejects.toMatchObject({
      retryNotBefore: new Date(8_640_000_000_000_000),
    });
    expect(clock.waits).toEqual([]);
  });

  test('preserves an enormous Retry-After and defers every job without early HTTP requests', async () => {
    const clock = virtualClock();
    let calls = 0;
    const downloader = new BeatmapFileDownloader({
      ...clock,
      fetch: async () => {
        calls++;
        return new Response('throttled', {
          status: 429,
          headers: { 'Retry-After': '86400' },
        });
      },
    });
    for (const id of [123, 124])
      await expect(downloader.download(id)).rejects.toMatchObject({
        code: 'rate_limited',
        retryNotBefore: new Date(86_400_000),
      });
    expect(calls).toBe(1);
    expect(clock.waits).toEqual([]);
  });

  test('expires an older download while a newer download waits for a later shared cooldown', async () => {
    let now = 0;
    const waits: Array<{ until: number; resolve: () => void }> = [];
    const started: Array<[number, number]> = [];
    let releaseEarlierResponse!: (response: Response) => void;
    const earlierResponse = new Promise<Response>((resolve) => {
      releaseEarlierResponse = resolve;
    });
    const downloader = new BeatmapFileDownloader({
      now: () => now,
      sleep: (delay) =>
        new Promise<void>((resolve) =>
          waits.push({ until: now + delay, resolve })
        ),
      concurrency: 2,
      fetch: async (url) => {
        const id = Number(url.split('/').at(-1));
        started.push([id, now]);
        const count = started.filter(([value]) => value === id).length;
        if (id === 123 && count === 1)
          return new Response('throttled', {
            status: 429,
            headers: { 'Retry-After': '170' },
          });
        if (id === 123) return earlierResponse;
        return count === 1
          ? new Response('throttled', {
              status: 429,
              headers: { 'Retry-After': '150' },
            })
          : new Response(bytesForId(id));
      },
    });
    let earlierError: unknown;
    let earlierSettledAt: number | undefined;
    const earlier = downloader.download(123).catch((error) => {
      earlierError = error;
      earlierSettledAt = now;
    });
    for (let i = 0; i < 10 && waits.length === 0; i++) await Bun.sleep(0);
    expect(waits.map(({ until }) => until)).toEqual([170_000]);
    now = 160_000;
    const later = downloader.download(124);
    await Bun.sleep(0);
    now = 170_000;
    for (const wait of waits.splice(0)) wait.resolve();
    for (let i = 0; i < 10 && waits.length === 0; i++) await Bun.sleep(0);
    expect(waits.map(({ until }) => until)).toEqual([320_000]);
    now = 171_000;
    releaseEarlierResponse(new Response('throttled', { status: 429 }));
    await Bun.sleep(0);
    now = 181_000;
    try {
      expect(earlierError).toMatchObject({
        code: 'rate_limited',
        retryNotBefore: new Date(320_000),
      });
      expect(earlierSettledAt).toBe(171_000);
      expect(started.filter(([id]) => id === 123)).toEqual([
        [123, 0],
        [123, 170_000],
      ]);
    } finally {
      now = 320_000;
      for (const wait of waits.splice(0)) wait.resolve();
      await Promise.all([earlier, later]);
    }
    expect(started.filter(([id]) => id === 123)).toHaveLength(2);
    expect(started.filter(([id]) => id === 124)).toEqual([
      [124, 170_000],
      [124, 320_000],
    ]);
    expect(waits).toEqual([]);
  });

  test('shares a 429 cooldown across concurrent jobs while preserving download concurrency', async () => {
    let now = 0;
    const waits: Array<{ until: number; resolve: () => void }> = [];
    const started: Array<[number, number]> = [];
    const downloader = new BeatmapFileDownloader({
      now: () => now,
      sleep: (delay) =>
        new Promise<void>((resolve) =>
          waits.push({ until: now + delay, resolve })
        ),
      concurrency: 2,
      fetch: async (url) => {
        const id = Number(url.split('/').at(-1));
        started.push([id, now]);
        return id === 123 &&
          started.filter(([value]) => value === id).length === 1
          ? new Response('throttled', { status: 429 })
          : new Response(bytesForId(id));
      },
    });
    const first = downloader.download(123);
    for (let i = 0; i < 10 && waits.length === 0; i++) await Bun.sleep(0);
    expect(waits.map(({ until }) => until)).toEqual([8_000]);
    const second = downloader.download(124);
    await Bun.sleep(0);
    expect(started).toEqual([[123, 0]]);
    now = 8_000;
    for (const wait of waits.splice(0)) wait.resolve();
    await Promise.all([first, second]);
    expect(started.slice(1).map(([, time]) => time)).toEqual([8_000, 8_000]);
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

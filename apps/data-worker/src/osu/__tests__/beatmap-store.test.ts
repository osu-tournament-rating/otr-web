import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from 'bun:test';
import { join } from 'path';
import { tmpdir } from 'os';
import { rmSync } from 'fs';
import { gzipSync, gunzipSync, file as localFile } from 'bun';
import type { RateLimiter } from '../../rate-limiter';
import type { Logger } from '../../logging/logger';

// #region Mocks

const mockGcsFile = {
  exists: mock(() => Promise.resolve([false] as [boolean])),
  download: mock(() => Promise.resolve([Buffer.from('')] as [Buffer])),
  save: mock((_data: unknown, _opts: unknown) => Promise.resolve()),
};

const mockGcsBucket = {
  exists: mock(() => Promise.resolve([true] as [boolean])),
  file: mock((_name: string) => mockGcsFile),
};

mock.module('@google-cloud/storage', () => ({
  Storage: class {
    bucket(_name: string) {
      return mockGcsBucket;
    }
  },
}));

// #endregion

import {
  LocalBeatmapStorage,
  GcsBeatmapStorage,
  createBeatmapStorage,
  beatmapFilename,
} from '../beatmap-store';

// #region Helpers

const passthroughLimiter = (): RateLimiter => ({
  schedule: (task) => task(),
});

const noopLogger: Logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  child: () => noopLogger,
};

type FetchSpy = ReturnType<typeof spyOn<typeof globalThis, 'fetch'>>;

const sampleContent = new TextEncoder().encode('osu beatmap file content');

const mockFetchResponse = (status: number, data?: ArrayBuffer) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    arrayBuffer: () => Promise.resolve(data ?? new ArrayBuffer(0)),
  } as Response);

let beatmapId = 1;

afterEach(() => {
  beatmapId++;
});

// #endregion

// #region LocalBeatmapStorage

describe('LocalBeatmapStorage', () => {
  const directory = join(tmpdir(), `beatmap-local-${Date.now()}`);

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  const makeStorage = (dir = directory) =>
    new LocalBeatmapStorage({
      directory: dir,
      rateLimiter: passthroughLimiter(),
      logger: noopLogger,
    });

  describe('exists()', () => {
    it('returns false when the file has not been stored', async () => {
      expect(await makeStorage().exists(beatmapId)).toBe(false);
    });

    it('returns true after the file has been stored', async () => {
      const storage = makeStorage();
      await storage.store(beatmapId, sampleContent);
      expect(await storage.exists(beatmapId)).toBe(true);
    });
  });

  describe('store()', () => {
    it('writes a gzip-compressed file to disk', async () => {
      const storage = makeStorage();
      await storage.store(beatmapId, sampleContent);

      const raw = await localFile(
        join(directory, beatmapFilename(beatmapId))
      ).arrayBuffer();
      const decompressed = gunzipSync(new Uint8Array(raw));
      expect(decompressed).toEqual(sampleContent);
    });

    it('creates the storage directory when it does not exist', async () => {
      const nested = join(directory, 'nested', 'deep');
      const storage = makeStorage(nested);
      await storage.store(beatmapId, sampleContent);
      expect(await storage.exists(beatmapId)).toBe(true);
    });
  });

  describe('get()', () => {
    let fetchSpy: FetchSpy;

    beforeEach(() => {
      fetchSpy = spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('returns decompressed data when the file already exists', async () => {
      const storage = makeStorage();
      await storage.store(beatmapId, sampleContent);

      const result = await storage.get(beatmapId);
      expect(result).toEqual(sampleContent);
    });

    it('downloads, stores, and returns data when the file is not present', async () => {
      const storage = makeStorage();
      fetchSpy.mockReturnValue(mockFetchResponse(200, sampleContent.buffer));

      const result = await storage.get(beatmapId);
      expect(result).toEqual(sampleContent);
      expect(await storage.exists(beatmapId)).toBe(true);
    });

    it('returns an empty buffer when download was unsuccessful', async () => {
      const storage = makeStorage();
      fetchSpy.mockReturnValue(mockFetchResponse(404));

      const result = await storage.get(beatmapId);
      expect(result.byteLength).toBe(0);
    });

    it('stores an empty placeholder file when download was unsuccessful', async () => {
      const storage = makeStorage();
      fetchSpy.mockReturnValue(mockFetchResponse(404));

      const result = await storage.get(beatmapId);
      const raw = await localFile(
        join(directory, beatmapFilename(beatmapId))
      ).arrayBuffer();
      const decompressed = gunzipSync(new Uint8Array(raw));

      expect(result.byteLength).toBe(0);
      expect(decompressed.byteLength).toBe(0);
    });
  });
});

// #endregion

// #region GcsBeatmapStorage

describe('GcsBeatmapStorage', () => {
  beforeEach(() => {
    mockGcsFile.exists.mockReset();
    mockGcsFile.download.mockReset();
    mockGcsFile.save.mockReset();
    mockGcsBucket.exists.mockReset();
    mockGcsBucket.file.mockReset();
    mockGcsBucket.file.mockImplementation(() => mockGcsFile);
  });

  const makeStorage = () =>
    new GcsBeatmapStorage({
      bucketName: 'test-bucket',
      rateLimiter: passthroughLimiter(),
      logger: noopLogger,
    });

  describe('exists()', () => {
    it('returns true when the file exists in GCS', async () => {
      mockGcsFile.exists.mockResolvedValue([true] as [boolean]);
      expect(await makeStorage().exists(beatmapId)).toBe(true);
    });

    it('returns false when the file does not exist in GCS', async () => {
      mockGcsFile.exists.mockResolvedValue([false] as [boolean]);
      expect(await makeStorage().exists(beatmapId)).toBe(false);
    });
  });

  describe('store()', () => {
    it('saves a gzip-compressed file to GCS with the correct content type', async () => {
      mockGcsFile.save.mockResolvedValue(undefined);

      await makeStorage().store(beatmapId, sampleContent);

      expect(mockGcsFile.save).toHaveBeenCalledTimes(1);
      const [savedData, savedOpts] = mockGcsFile.save.mock.calls[0] as [
        Uint8Array,
        { contentType: string },
      ];
      expect(savedOpts).toEqual({ contentType: 'application/gzip' });
      expect(gunzipSync(new Uint8Array(savedData))).toEqual(sampleContent);
    });

    it('uses the filename derived from the beatmapId', async () => {
      mockGcsFile.save.mockResolvedValue(undefined);
      await makeStorage().store(beatmapId, sampleContent);
      expect(mockGcsBucket.file).toHaveBeenCalledWith(
        beatmapFilename(beatmapId)
      );
    });
  });

  describe('get()', () => {
    let fetchSpy: FetchSpy;

    beforeEach(() => {
      fetchSpy = spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('decompresses and returns data when the file is already in GCS', async () => {
      const compressed = gzipSync(sampleContent);
      mockGcsFile.exists.mockResolvedValue([true] as [boolean]);
      mockGcsFile.download.mockResolvedValue([Buffer.from(compressed)] as [
        Buffer,
      ]);

      const result = await makeStorage().get(beatmapId);
      expect(result).toEqual(sampleContent);
    });

    it('downloads from osu!, stores to GCS, and returns raw data when not cached', async () => {
      mockGcsFile.exists.mockResolvedValue([false] as [boolean]);
      mockGcsFile.save.mockResolvedValue(undefined);
      fetchSpy.mockReturnValue(mockFetchResponse(200, sampleContent.buffer));

      const result = await makeStorage().get(beatmapId);
      expect(result).toEqual(sampleContent);
      expect(mockGcsFile.save).toHaveBeenCalled();
    });
  });

  describe('create()', () => {
    it('returns a GcsBeatmapStorage instance when the bucket exists', async () => {
      mockGcsBucket.exists.mockResolvedValue([true] as [boolean]);

      const instance = await GcsBeatmapStorage.create({
        bucketName: 'valid-bucket',
        rateLimiter: passthroughLimiter(),
        logger: noopLogger,
      });

      expect(instance).toBeInstanceOf(GcsBeatmapStorage);
    });

    it('throws when the bucket does not exist', async () => {
      mockGcsBucket.exists.mockResolvedValue([false] as [boolean]);

      expect(
        GcsBeatmapStorage.create({
          bucketName: 'missing-bucket',
          rateLimiter: passthroughLimiter(),
          logger: noopLogger,
        })
      ).rejects.toThrow();
    });

    it('throws when GCS credentials are unavailable', async () => {
      mockGcsBucket.exists.mockRejectedValue(new Error('UNAUTHENTICATED'));

      expect(
        GcsBeatmapStorage.create({
          bucketName: 'test-bucket',
          rateLimiter: passthroughLimiter(),
          logger: noopLogger,
        })
      ).rejects.toThrow();
    });
  });
});

// #endregion

// #region createBeatmapStorage

describe('createBeatmapStorage', () => {
  const directory = join(tmpdir(), `beatmap-factory-${Date.now()}`);

  afterAll(async () => {
    rmSync(directory, { recursive: true, force: true });
  });

  beforeEach(() => {
    mockGcsBucket.exists.mockReset();
    mockGcsBucket.file.mockReset();
    mockGcsBucket.file.mockImplementation(() => mockGcsFile);
  });

  it('creates a LocalBeatmapStorage when no bucket name is provided', async () => {
    const storage = await createBeatmapStorage({
      directory,
      rateLimiter: passthroughLimiter(),
      logger: noopLogger,
    });
    expect(storage).toBeInstanceOf(LocalBeatmapStorage);
  });

  it('creates a GcsBeatmapStorage when a bucket name is provided and GCS is reachable', async () => {
    mockGcsBucket.exists.mockResolvedValue([true] as [boolean]);

    const storage = await createBeatmapStorage({
      directory,
      bucketName: 'valid-bucket',
      rateLimiter: passthroughLimiter(),
      logger: noopLogger,
    });

    expect(storage).toBeInstanceOf(GcsBeatmapStorage);
  });

  it('falls back to LocalBeatmapStorage and logs a warning when GCS is unavailable', async () => {
    mockGcsBucket.exists.mockResolvedValue([false] as [boolean]);

    const storage = await createBeatmapStorage({
      directory,
      bucketName: 'bad-bucket',
      rateLimiter: passthroughLimiter(),
      logger: noopLogger,
    });

    expect(storage).toBeInstanceOf(LocalBeatmapStorage);
  });
});

// #endregion

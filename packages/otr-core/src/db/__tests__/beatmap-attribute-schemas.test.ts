import { expect, test } from 'bun:test';
import { BeatmapFileSchema } from '../beatmap-attribute-schemas';
import { DataFetchStatus } from '../data-fetch-status';

const fetching = {
  id: 1,
  beatmapId: 2,
  provider: 'local' as const,
  osuBeatmapId: 2785319,
  sourceUrl: 'https://osu.ppy.sh/osu/2785319',
  fetchStatus: DataFetchStatus.Fetching,
  lastFetchAttempt: '2026-09-07T00:00:00Z',
  errorCode: null,
  checksum: null,
  storageKey: null,
  byteLength: null,
  acquiredAt: null,
  sourceMode: null,
  keyCount: null,
};
const fetched = {
  ...fetching,
  fetchStatus: DataFetchStatus.Fetched,
  checksum: 'a'.repeat(64),
  storageKey: `sha256/aa/${'a'.repeat(64)}.osu`,
  byteLength: 1234,
  acquiredAt: '2026-09-07T00:00:01Z',
};

test('file acquisition status is visible before bytes or parsed metadata exist', () => {
  expect(BeatmapFileSchema.parse(fetching)).toEqual(fetching);
  expect(
    BeatmapFileSchema.parse({
      ...fetching,
      fetchStatus: DataFetchStatus.Error,
      errorCode: 'network',
    }).errorCode
  ).toBe('network');
  expect(BeatmapFileSchema.parse(fetched)).toEqual(fetched);
});

test('Fetched requires complete validated provenance while parsed native fields can follow', () => {
  for (const field of ['checksum', 'storageKey', 'byteLength', 'acquiredAt'])
    expect(
      BeatmapFileSchema.safeParse({ ...fetched, [field]: null }).success
    ).toBe(false);
  expect(
    BeatmapFileSchema.safeParse({ ...fetched, byteLength: 0 }).success
  ).toBe(false);
  expect(
    BeatmapFileSchema.safeParse({ ...fetched, checksum: 'invalid' }).success
  ).toBe(false);
  expect(
    BeatmapFileSchema.parse({ ...fetched, sourceMode: 3, keyCount: 4 }).keyCount
  ).toBe(4);
  for (const fields of [
    { sourceMode: 3, keyCount: null },
    { sourceMode: 0, keyCount: 4 },
    { sourceMode: null, keyCount: 4 },
    { sourceMode: 4, keyCount: 4 },
  ])
    expect(BeatmapFileSchema.safeParse({ ...fetched, ...fields }).success).toBe(
      false
    );
});

test('file fetch status keeps existing ordinals and error codes cannot contain raw diagnostics', () => {
  expect(DataFetchStatus).toEqual({
    NotFetched: 0,
    Fetching: 1,
    Fetched: 2,
    NotFound: 3,
    Error: 4,
  });
  expect(
    BeatmapFileSchema.safeParse({ ...fetching, fetchStatus: 5 }).success
  ).toBe(false);
  expect(
    BeatmapFileSchema.safeParse({
      ...fetching,
      errorCode: 'https://secret@example.com/error',
    }).success
  ).toBe(false);
});

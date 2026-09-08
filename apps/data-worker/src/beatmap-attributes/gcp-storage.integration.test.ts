import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { Storage } from '@google-cloud/storage';

import { GcpBeatmapFileStorage } from './gcp-storage';
import {
  beatmapFileChecksum,
  beatmapFileStorageKey,
  MAX_BEATMAP_FILE_BYTES,
} from './storage';

// Runs only against a local fake-gcs-server. See BEATMAP_ATTRIBUTES.md.
const endpoint = process.env.BEATMAP_ATTRIBUTES_TEST_GCS_ENDPOINT;
if (
  endpoint &&
  !['127.0.0.1', 'localhost'].includes(new URL(endpoint).hostname)
)
  throw new Error('GCS integration tests run only against a local emulator');
const suite = endpoint ? describe : describe.skip;
suite('GCP beatmap storage against a local emulator', () => {
  const client = new Storage({
    apiEndpoint: endpoint,
    projectId: 'otr-test',
    retryOptions: { autoRetry: false },
  });
  const bucketName = `otr-beatmap-files-${Date.now()}`;
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
  const checksum = beatmapFileChecksum(fileBytes);
  const key = beatmapFileStorageKey(checksum);
  let storage: GcpBeatmapFileStorage;

  beforeAll(async () => {
    await client.createBucket(bucketName);
    storage = new GcpBeatmapFileStorage(bucketName, { endpoint });
  });
  afterAll(async () => {
    const bucket = client.bucket(bucketName);
    await bucket.deleteFiles({ force: true });
    await bucket.delete();
  });

  test('verifies access, stores one immutable object for a checksum, and reads it back', async () => {
    await storage.verifyAccess();
    expect(await storage.get(key)).toBeNull();
    await storage.put(key, fileBytes);
    expect(await storage.get(key)).toEqual(fileBytes);
    const [metadata] = await client.bucket(bucketName).file(key).getMetadata();
    expect(metadata.contentType).toBe('text/plain; charset=utf-8');
    expect(metadata.metadata).toEqual({ sha256: checksum });
    await storage.put(key, fileBytes);
    const [again] = await client.bucket(bucketName).file(key).getMetadata();
    expect(again.generation).toBe(metadata.generation);
  }, 30_000);

  test('rejects a corrupted or oversized stored object and reports a missing bucket', async () => {
    await client
      .bucket(bucketName)
      .file(key)
      .save(new Uint8Array([1, 2, 3]));
    await expect(storage.get(key)).rejects.toMatchObject({
      code: 'checksum_mismatch',
      retryable: false,
    });
    await expect(storage.put(key, fileBytes)).rejects.toMatchObject({
      code: 'checksum_mismatch',
      retryable: false,
    });
    const oversized = new Uint8Array(MAX_BEATMAP_FILE_BYTES + 1);
    const oversizedKey = beatmapFileStorageKey(beatmapFileChecksum(oversized));
    await client.bucket(bucketName).file(oversizedKey).save(oversized);
    await expect(storage.get(oversizedKey)).rejects.toMatchObject({
      code: 'too_large',
      retryable: false,
    });
    await expect(
      new GcpBeatmapFileStorage(`${bucketName}-missing`, {
        endpoint,
      }).verifyAccess()
    ).rejects.toThrow(/does not exist/);
  }, 60_000);
});

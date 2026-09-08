import { describe, expect, test } from 'bun:test';
import { MAX_ATTEMPTS, readAttributesConfig, retryDelayMs } from './policy';

describe('attribute processing bounds', () => {
  test('processing is explicitly opt in', () => {
    expect(readAttributesConfig({}).enabled).toBe(false);
  });
  test('retries back off and stop after the persisted attempt budget', () => {
    expect(retryDelayMs(1)).toBe(15_000);
    expect(retryDelayMs(2)).toBe(30_000);
    expect(retryDelayMs(MAX_ATTEMPTS)).toBeNull();
  });
  test('rejects ambiguous storage and unbounded concurrency', () => {
    expect(() =>
      readAttributesConfig({ BEATMAP_ATTRIBUTES_ENABLED: 'true' })
    ).toThrow();
    expect(() =>
      readAttributesConfig({
        BEATMAP_ATTRIBUTES_ENABLED: 'true',
        BEATMAP_ATTRIBUTES_STORAGE: 'local',
        BEATMAP_ATTRIBUTES_LOCAL_DIR: '/tmp/attributes',
        BEATMAP_ATTRIBUTES_CONCURRENCY: '99',
      })
    ).toThrow();
  });
});

describe('gcp credential configuration', () => {
  const key = {
    type: 'service_account',
    client_email: 'attributes@example.iam.gserviceaccount.com',
    private_key:
      '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    private_key_id: 'ignored',
  };
  const expected = {
    client_email: key.client_email,
    private_key: key.private_key,
  };
  const gcp = (credentials?: string) => ({
    BEATMAP_ATTRIBUTES_ENABLED: 'true',
    BEATMAP_ATTRIBUTES_STORAGE: 'gcp',
    BEATMAP_ATTRIBUTES_GCP_BUCKET: 'otr-beatmap-files',
    ...(credentials === undefined
      ? {}
      : { BEATMAP_ATTRIBUTES_GCP_CREDENTIALS: credentials }),
  });
  test('blank credentials keep ambient authentication', () => {
    expect(readAttributesConfig(gcp()).credentials).toBeUndefined();
    expect(readAttributesConfig(gcp('  ')).credentials).toBeUndefined();
  });
  test('accepts a service account key as base64 or JSON and keeps only the signing fields', () => {
    expect(
      readAttributesConfig(
        gcp(Buffer.from(JSON.stringify(key)).toString('base64'))
      ).credentials
    ).toEqual(expected);
    expect(readAttributesConfig(gcp(JSON.stringify(key))).credentials).toEqual(
      expected
    );
  });
  test('rejects malformed or incomplete keys without echoing the value', () => {
    for (const invalid of [
      'not base64 or json',
      Buffer.from('{"client_email":"x"}').toString('base64'),
      JSON.stringify({ private_key: key.private_key }),
      JSON.stringify({ client_email: key.client_email, private_key: 7 }),
      '[]',
    ]) {
      let message = '';
      try {
        readAttributesConfig(gcp(invalid));
      } catch (error) {
        message = String(error);
      }
      expect(message).toContain('BEATMAP_ATTRIBUTES_GCP_CREDENTIALS');
      expect(message).not.toContain('PRIVATE KEY');
      expect(message).not.toContain(key.client_email);
    }
  });
  test('the local provider ignores gcp credentials', () => {
    expect(
      readAttributesConfig({
        BEATMAP_ATTRIBUTES_ENABLED: 'true',
        BEATMAP_ATTRIBUTES_STORAGE: 'local',
        BEATMAP_ATTRIBUTES_LOCAL_DIR: '/tmp/attributes',
        BEATMAP_ATTRIBUTES_GCP_CREDENTIALS: 'garbage',
      }).credentials
    ).toBeUndefined();
  });
});

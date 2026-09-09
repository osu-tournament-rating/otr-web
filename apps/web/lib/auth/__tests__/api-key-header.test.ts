import { describe, expect, test } from 'bun:test';
import { extractApiKey } from '../api-key-header';

describe('API key header contract', () => {
  test('leaves requests without key headers anonymous', () => {
    expect(extractApiKey(new Headers())).toBeNull();
  });
  test('accepts whitespace and case variants of the bearer scheme', () => {
    expect(
      extractApiKey(new Headers({ authorization: '  bEaReR\t example-key  ' }))
    ).toBe('example-key');
  });
  test('gives authorization precedence when both key headers are present', () => {
    expect(
      extractApiKey(
        new Headers({
          authorization: 'Bearer first-key',
          'x-api-key': 'second-key',
        })
      )
    ).toBe('first-key');
  });
  test.each(['Basic other-credential', 'Bearer', 'Bearer key with spaces'])(
    'rejects malformed authorization instead of falling through: %s',
    (authorization) => {
      expect(() =>
        extractApiKey(
          new Headers({ authorization, 'x-api-key': 'another-key' })
        )
      ).toThrow();
    }
  );
  test('rejects an explicitly empty API key', () => {
    expect(() => extractApiKey(new Headers({ 'x-api-key': ' ' }))).toThrow();
  });
});

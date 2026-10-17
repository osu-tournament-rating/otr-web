import { describe, expect, it } from 'bun:test';

import { normalizeApiKeyHeader } from '../api-key-header';

const expectUnauthorized = async (headers: HeadersInit, message: string) => {
  const result = normalizeApiKeyHeader(new Headers(headers));

  if (!('response' in result)) {
    throw new Error('Expected a 401 response');
  }

  expect(result.response.status).toBe(401);
  expect(result.response.headers.get('www-authenticate')).toBe(
    'Bearer realm="otr_api"'
  );
  expect(await result.response.json()).toEqual({ error: message });
};

describe('normalizeApiKeyHeader', () => {
  it('passes a Bearer authorization through unchanged', () => {
    const headers = new Headers({ authorization: 'Bearer key-123' });

    expect(normalizeApiKeyHeader(headers)).toEqual({ headers });
  });

  it('turns an x-api-key header into a Bearer authorization', () => {
    const headers = new Headers({ 'x-api-key': ' key-123 ', accept: 'a/b' });
    const result = normalizeApiKeyHeader(headers);

    if (!('headers' in result)) {
      throw new Error('Expected headers');
    }

    expect(result.headers.get('authorization')).toBe('Bearer key-123');
    expect(result.headers.get('accept')).toBe('a/b');
    expect(headers.has('authorization')).toBe(false);
  });

  it('prefers the authorization header over x-api-key', () => {
    const headers = new Headers({
      authorization: 'Bearer from-authorization',
      'x-api-key': 'from-x-api-key',
    });

    expect(normalizeApiKeyHeader(headers)).toEqual({ headers });
  });

  it('rejects a request without a key', async () => {
    await expectUnauthorized(
      {},
      'An API key is required to access this endpoint.'
    );
    await expectUnauthorized(
      { 'x-api-key': '   ' },
      'An API key is required to access this endpoint.'
    );
  });

  it('rejects an authorization header that is not Bearer', async () => {
    await expectUnauthorized(
      { authorization: 'Basic dXNlcjpwYXNz' },
      'Provide the API key using the Authorization: Bearer <key> header.'
    );
  });

  it('rejects a Bearer authorization without a key', async () => {
    await expectUnauthorized(
      { authorization: 'Bearer    ' },
      'Provide the API key using the Authorization: Bearer <key> header.'
    );
  });
});

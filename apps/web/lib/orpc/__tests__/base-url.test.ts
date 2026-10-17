import { afterEach, describe, expect, it } from 'bun:test';

import { serverRpcBaseUrl } from '../base-url';

describe('serverRpcBaseUrl', () => {
  // Widened view: the app's env typings declare these vars as required, but
  // the tests must be able to unset them.
  const env = process.env as Record<string, string | undefined>;
  const originalEnv = {
    INTERNAL_APP_BASE_URL: env.INTERNAL_APP_BASE_URL,
    NEXT_PUBLIC_APP_BASE_URL: env.NEXT_PUBLIC_APP_BASE_URL,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete env[key];
      } else {
        env[key] = value;
      }
    }
  });

  it('prefers INTERNAL_APP_BASE_URL', () => {
    env.INTERNAL_APP_BASE_URL = 'http://web:3000';
    env.NEXT_PUBLIC_APP_BASE_URL = 'http://localhost:3000';
    expect(serverRpcBaseUrl()).toBe('http://web:3000');
  });

  it.each([undefined, '', '   '])(
    'falls back to NEXT_PUBLIC_APP_BASE_URL when INTERNAL_APP_BASE_URL is %p',
    (internal) => {
      if (internal === undefined) {
        delete env.INTERNAL_APP_BASE_URL;
      } else {
        env.INTERNAL_APP_BASE_URL = internal;
      }
      env.NEXT_PUBLIC_APP_BASE_URL = 'http://localhost:3000';
      expect(serverRpcBaseUrl()).toBe('http://localhost:3000');
    }
  );

  it('is undefined when neither URL is set', () => {
    env.INTERNAL_APP_BASE_URL = '';
    delete env.NEXT_PUBLIC_APP_BASE_URL;
    expect(serverRpcBaseUrl()).toBeUndefined();
  });
});

import { describe, expect, test } from 'bun:test';

import { getSafeCallbackRedirect } from '../auth-redirect';

describe('getSafeCallbackRedirect', () => {
  test.each([null, ''])('uses the home page for %j', (redirectTo) => {
    expect(getSafeCallbackRedirect(redirectTo)).toBe('/');
  });

  test.each([
    '/',
    '/players/440',
    '/leaderboard?ruleset=1&country=US#rankings',
    '/search?q=hello%20world',
    '/search?url=https://example.com/path#//example.com',
  ])('preserves a local destination %j', (redirectTo) => {
    expect(getSafeCallbackRedirect(redirectTo)).toBe(redirectTo);
  });

  test.each([
    'https://example.com/phishing',
    'http://example.com/phishing',
    '//example.com/phishing',
    '///example.com/phishing',
    '/\\example.com/phishing',
    '\\example.com/phishing',
    '/\t/example.com/phishing',
    '/\n/example.com/phishing',
    '/\r/example.com/phishing',
    '/\u0000/example.com/phishing',
    '/\u007f/example.com/phishing',
    'javascript:alert(document.domain)',
    'data:text/html,hello',
    'players/440',
    ' https://example.com/phishing',
    '/..//example.com/phishing',
    '/players/..//example.com/phishing',
    '/%2e%2e//example.com/phishing',
    '/players/%2E%2E//example.com/phishing',
  ])('uses the home page for an unsafe destination %j', (redirectTo) => {
    expect(getSafeCallbackRedirect(redirectTo)).toBe('/');
  });

  test('normalizes safe local path segments', () => {
    expect(
      getSafeCallbackRedirect('/players/../leaderboard?ruleset=1#top')
    ).toBe('/leaderboard?ruleset=1#top');
  });
});

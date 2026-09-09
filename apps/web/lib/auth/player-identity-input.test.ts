import { describe, expect, test } from 'bun:test';
import { parseUserInput } from 'better-auth/db';

import { auth } from './auth';

describe('OAuth-owned player identity input', () => {
  test.each([123, '123', { id: 123 }])(
    'rejects a client playerId value of %j',
    (playerId) => {
      expect(() =>
        parseUserInput(auth.options, { playerId }, 'update')
      ).toThrow();
    }
  );
  test('does not include an ignored null playerId in the update', () => {
    expect(
      parseUserInput(auth.options, { playerId: null }, 'update')
    ).not.toHaveProperty('playerId');
  });
});

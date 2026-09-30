import { describe, expect, test } from 'bun:test';
import { parseUserInput } from 'better-auth/db';

import { auth } from '../auth';

// `parseUserInput` is the filter Better Auth's `/update-user` applies to the
// request body before writing the user row.
describe('auth user input', () => {
  test('rejects a client-supplied playerId on update', () => {
    expect(() =>
      parseUserInput(auth.options, { playerId: 1 }, 'update')
    ).toThrow('playerId is not allowed to be set');
  });

  test('allows updates that omit playerId', () => {
    expect(parseUserInput(auth.options, {}, 'update')).toEqual({});
  });
});

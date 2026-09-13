import { describe, expect, test } from 'bun:test';

import { resolveActor } from '../helpers';

const session = {
  user: { osuId: 8191845 },
  dbUser: { id: 1 },
  dbPlayer: { id: 440, osuId: 8191845, username: 'Stage' },
};

const apiKey = {
  id: 'key_1234567890',
  userId: 'user-1',
  name: null,
  enabled: true,
};
const apiKeyActor = {
  userId: 'user-1',
  playerId: 440,
  osuId: 8191845,
  osuUsername: 'Stage',
};

describe('resolveActor', () => {
  test('labels a request without credentials anonymous', () => {
    expect(resolveActor({})).toEqual({
      accessMethod: 'anonymous',
      userId: null,
      playerId: null,
      osuId: null,
      osuUsername: null,
      apiKeyId: null,
      apiKeyName: null,
    });
  });

  test('treats a retired bot client as anonymous', () => {
    const context = { session: null, client: 'discord-bot' };
    expect(resolveActor(context).accessMethod).toBe('anonymous');
  });

  test('resolves a session identity', () => {
    expect(resolveActor({ session })).toMatchObject({
      accessMethod: 'session',
      userId: '1',
      playerId: 440,
      osuId: '8191845',
      osuUsername: 'Stage',
    });
  });

  test('resolves an api-key identity ahead of a session', () => {
    expect(resolveActor({ apiKey, apiKeyActor, session })).toMatchObject({
      accessMethod: 'api-key',
      userId: 'user-1',
      playerId: 440,
      apiKeyId: 'key_1...',
    });
  });
});

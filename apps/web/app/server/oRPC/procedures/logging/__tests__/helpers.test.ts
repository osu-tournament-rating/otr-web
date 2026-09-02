import { describe, expect, test } from 'bun:test';
import { DISCORD_BOT_CLIENT } from '@otr/core/logging';

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
  test('labels an anonymous call with the bot header discord-bot', () => {
    expect(resolveActor({ client: DISCORD_BOT_CLIENT })).toMatchObject({
      accessMethod: 'discord-bot',
      userId: null,
      playerId: null,
    });
  });

  test('keeps a session identity when the bot header is present', () => {
    expect(resolveActor({ session, client: DISCORD_BOT_CLIENT })).toMatchObject(
      {
        accessMethod: 'session',
        playerId: 440,
        osuUsername: 'Stage',
      }
    );
  });

  test('keeps an api-key identity when the bot header is present', () => {
    expect(
      resolveActor({ apiKey, apiKeyActor, client: DISCORD_BOT_CLIENT })
    ).toMatchObject({
      accessMethod: 'api-key',
      playerId: 440,
    });
  });

  test('ignores an unknown client value', () => {
    expect(resolveActor({ client: 'someone-else' }).accessMethod).toBe(
      'anonymous'
    );
  });
});

import { describe, expect, test } from 'bun:test';

import { UserDetailSchema } from '../user';

describe('UserDetailSchema', () => {
  test('drops internal player columns', () => {
    const parsed = UserDetailSchema.parse({
      id: 1,
      lastLogin: '2026-08-01 00:00:00+00',
      scopes: ['user'],
      playerId: 2,
      created: '2026-08-01 00:00:00+00',
      updated: null,
      lastViewedReportsAt: null,
      userSettings: [
        {
          id: 3,
          defaultRuleset: 0,
          defaultRulesetIsControlled: false,
          themeHotkeyEnabled: true,
          userId: 1,
          created: '2026-08-01 00:00:00+00',
          updated: null,
        },
      ],
      player: {
        id: 2,
        osuId: 4,
        username: 'peppy',
        searchVector: "'peppy':1A",
        previousUsernames: ['old name'],
        country: 'AU',
        defaultRuleset: 0,
        osuLastFetch: '2026-08-01 00:00:00+00',
        osuTrackLastFetch: null,
        osuTrackDataFetchStatus: 0,
        dataFetchStatus: 0,
        created: '2026-08-01 00:00:00+00',
        updated: null,
      },
    });

    expect(Object.keys(parsed.player ?? {})).not.toContain('searchVector');
    expect(Object.keys(parsed.player ?? {})).not.toContain('previousUsernames');
  });
});

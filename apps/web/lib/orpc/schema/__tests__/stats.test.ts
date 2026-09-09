import { describe, expect, test } from 'bun:test';

import { Ruleset } from '@otr/core/osu';
import { PLAYER_STATS_RULESETS } from '@otr/core/stats/player-stats';

import { PlayerStatsRulesetSchema } from '../stats';

describe('PlayerStatsRulesetSchema', () => {
  test.each([...PLAYER_STATS_RULESETS])('accepts ruleset %i', (ruleset) => {
    expect(PlayerStatsRulesetSchema.parse(ruleset)).toBe(ruleset);
  });

  test('coerces the query string form of a ruleset', () => {
    expect(PlayerStatsRulesetSchema.safeParse('0').success).toBe(false);
    expect(PlayerStatsRulesetSchema.parse(Number('0'))).toBe(Ruleset.Osu);
  });

  test('rejects rulesets without a snapshot', () => {
    expect(PlayerStatsRulesetSchema.safeParse(Ruleset.ManiaOther).success).toBe(
      false
    );
    expect(PlayerStatsRulesetSchema.safeParse(9).success).toBe(false);
  });
});

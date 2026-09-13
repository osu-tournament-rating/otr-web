import { Ruleset } from '@otr/core/osu';
import { PLAYER_STATS_RULESETS } from '@otr/core/stats/player-stats';

import {
  PlayerStatsRulesetSchema,
  type PlayerStatsRulesetValue,
} from '@/lib/orpc/schema/stats';

export const STATS_TABS = ['tournaments', 'players'] as const;

export type StatsTab = (typeof STATS_TABS)[number];

export const DEFAULT_STATS_TAB: StatsTab = 'tournaments';
export const DEFAULT_STATS_RULESET: PlayerStatsRulesetValue = Ruleset.Osu;

export const STATS_RULESETS = PLAYER_STATS_RULESETS;

type SearchParamValue = string | string[] | undefined;

const first = (value: SearchParamValue) =>
  Array.isArray(value) ? value[0] : value;

export function parseStatsTab(value: SearchParamValue): StatsTab {
  const candidate = first(value);

  return STATS_TABS.find((tab) => tab === candidate) ?? DEFAULT_STATS_TAB;
}

export function parseStatsRuleset(
  value: SearchParamValue
): PlayerStatsRulesetValue {
  const parsed = PlayerStatsRulesetSchema.safeParse(Number(first(value)));

  return parsed.success ? parsed.data : DEFAULT_STATS_RULESET;
}

/** `/stats` with both parameters, so switching one preserves the other. */
export function statsHref(tab: StatsTab, ruleset: PlayerStatsRulesetValue) {
  return `/stats?tab=${tab}&ruleset=${ruleset}`;
}

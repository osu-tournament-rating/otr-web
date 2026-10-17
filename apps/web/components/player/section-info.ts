import { MOD_CHART_DISPLAY_THRESHOLD } from '@/lib/utils/playerModCharts';

/*
 * The help text behind the profile's section headers. The loading screen
 * draws the same info buttons, so the text lives here, outside the client
 * chart modules a server component cannot read constants from.
 */

// The chart labels its dashed line "Peak" itself.
export const RATING_HISTORY_INFO =
  'Each entry represents a rating adjustment from a match or rating decay.';

/** Mod performance adds a sentence when a charted group includes EZ. */
export const MOD_PERFORMANCE_INFO = `Mods played in at least ${MOD_CHART_DISPLAY_THRESHOLD}% of all verified ScoreV2 games.`;

export const MOD_PERFORMANCE_EASY_NOTE =
  'All EZ scores are multiplied by 1.75x.';

export const MOD_DISTRIBUTION_INFO = `Mods played in at least ${MOD_CHART_DISPLAY_THRESHOLD}% of all verified games.`;

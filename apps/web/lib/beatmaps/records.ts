import { Ruleset, VerificationStatus } from '@otr/core/osu';

import type {
  BeatmapTournamentUsage,
  BeatmapUsagePoint,
} from '@/lib/orpc/schema/beatmapStats';

/** Renders a `YYYY-Q#` usage bucket as `Q# YYYY`. */
export function formatQuarterLong(quarter: string): string {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  return match ? `Q${match[2]} ${match[1]}` : quarter;
}

export interface ActivitySummary {
  firstActive: BeatmapUsagePoint | null;
  lastActive: BeatmapUsagePoint | null;
  activeQuarters: number;
  maxGames: number;
}

/**
 * Collapses the quarterly usage series into the span and scale the activity
 * card needs. Quarters with no pool records and no games are gaps, not history.
 */
export function summarizeActivity(
  points: BeatmapUsagePoint[]
): ActivitySummary {
  const active = points.filter(
    (point) => point.gameCount > 0 || point.pooledCount > 0
  );

  return {
    firstActive: active.at(0) ?? null,
    lastActive: active.at(-1) ?? null,
    activeQuarters: active.length,
    // The chart only draws game bars, so pool-record counts must not
    // contribute to the scale.
    maxGames: points.reduce((max, point) => Math.max(max, point.gameCount), 0),
  };
}

/**
 * Share of pool records where the beatmap was actually picked, as a whole
 * percent. Returns null when nothing pooled it, since there is no rate to show.
 */
export function getPoolPickRate(
  playedCount: number,
  pooledCount: number
): number | null {
  if (pooledCount <= 0) return null;

  const rate = (playedCount / pooledCount) * 100;
  if (rate > 0 && rate < 1) return 1;
  if (rate > 99 && rate < 100) return 99;

  return Math.round(rate);
}

/** Pool date used for ordering: when it was first played, else tournament dates. */
export function getPoolDate(pool: BeatmapTournamentUsage): string | null {
  return (
    pool.firstPlayedAt ?? pool.tournament.endTime ?? pool.tournament.startTime
  );
}

function getPoolTimestamp(pool: BeatmapTournamentUsage): number {
  const date = getPoolDate(pool);
  return date ? new Date(date).getTime() : 0;
}

export function sortPoolsByDate(
  pools: BeatmapTournamentUsage[]
): BeatmapTournamentUsage[] {
  return [...pools].sort((a, b) => getPoolTimestamp(b) - getPoolTimestamp(a));
}

/** Most-played ordering, falling back to recency so equal counts stay stable. */
export function sortPoolsByGames(
  pools: BeatmapTournamentUsage[]
): BeatmapTournamentUsage[] {
  return [...pools].sort(
    (a, b) =>
      b.gameCount - a.gameCount || getPoolTimestamp(b) - getPoolTimestamp(a)
  );
}

/**
 * Only verified tournaments carry a trustworthy game count; the rest are pool
 * records with no verified play behind them.
 */
export function isPoolVerified(pool: BeatmapTournamentUsage): boolean {
  return pool.tournament.verificationStatus === VerificationStatus.Verified;
}

function rulesetFamily(ruleset: Ruleset): Ruleset {
  return ruleset === Ruleset.Mania4k || ruleset === Ruleset.Mania7k
    ? Ruleset.ManiaOther
    : ruleset;
}

/**
 * True when a pool record comes from a tournament in a different ruleset
 * family than the beatmap — i.e. the tournament pooled a convert. 4K/7K/other
 * mania are one family, so key-mode variants never read as converts.
 */
export function isCrossRulesetPool(
  tournamentRuleset: Ruleset,
  beatmapRuleset: Ruleset
): boolean {
  return rulesetFamily(tournamentRuleset) !== rulesetFamily(beatmapRuleset);
}

/**
 * The tournament this beatmap produced the most verified scores in. Score count
 * rather than game count, because a 5v5 lobby yields far more scores per game
 * than a 1v1 one.
 */
export function getMostUsedInPool(
  pools: BeatmapTournamentUsage[]
): BeatmapTournamentUsage | null {
  return pools.reduce<BeatmapTournamentUsage | null>(
    (best, pool) =>
      pool.scoreCount > 0 && (!best || pool.scoreCount > best.scoreCount)
        ? pool
        : best,
    null
  );
}

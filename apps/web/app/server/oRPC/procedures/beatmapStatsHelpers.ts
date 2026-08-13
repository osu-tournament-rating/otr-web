import { Mods } from '@otr/core/osu';

import {
  RANK_RANGE_BUCKETS,
  getRankRangeBucketKey,
  type RankRangeBucketKey,
} from '@/lib/beatmaps/rankRange';
import { deriveGameIsFreeMod } from '@/lib/utils/mods';
import { tierData, tierNames, type TierName } from '@/lib/utils/tierData';
import type {
  BeatmapFreemodPickSummary,
  BeatmapRankRangeModDistribution,
} from '@/lib/orpc/schema/beatmapStats';

/**
 * Incidental score-level modifiers stripped by the beatmap mod display rules.
 * Shared between {@link normalizeScoreModsArithmetic} and the SQL mirror in
 * beatmapProcedures so both derive from the same constants.
 */
export const STRIPPED_SCORE_MODS_MASK = Mods.NoFail | Mods.SpunOut;

/**
 * Pure-arithmetic mirror of `normalizeBeatmapDisplayMods` (lib/utils/mods):
 * strip NoFail/SpunOut and fold Nightcore into DoubleTime. The SQL constant
 * `NORMALIZED_SCORE_MODS_SQL` in beatmapProcedures implements this exact CASE
 * expression; a parity test asserts both stay in sync.
 */
export function normalizeScoreModsArithmetic(mods: number): number {
  if ((mods & Mods.Nightcore) !== 0) {
    return (
      (mods & ~(Mods.Nightcore | STRIPPED_SCORE_MODS_MASK)) | Mods.DoubleTime
    );
  }

  return mods & ~STRIPPED_SCORE_MODS_MASK;
}

export interface FreemodPickRow {
  gameId: number;
  /** Forced mods recorded on the game itself. */
  gameMods: number;
  /** One distinct per-player mod combination inside the game. */
  scoreMods: number;
  /** Verified scores in the game using that combination. */
  scoreCount: number;
}

/**
 * Collapses per-game score-mod rows into the freemod pick summary. Freemod
 * detection reuses `deriveGameIsFreeMod` so the definition matches the match
 * endpoints (FreeModAllowed flag, or per-score mods varying from the game's).
 * Distribution rows carry raw score bitmasks; the client normalizes them for
 * display.
 */
export function summarizeFreemodPicks(
  rows: FreemodPickRow[]
): BeatmapFreemodPickSummary {
  const rowsByGame = new Map<number, FreemodPickRow[]>();
  for (const row of rows) {
    const gameRows = rowsByGame.get(row.gameId) ?? [];
    gameRows.push(row);
    rowsByGame.set(row.gameId, gameRows);
  }

  let freemodGameCount = 0;
  let freemodScoreCount = 0;
  const countsByMods = new Map<number, number>();

  for (const gameRows of rowsByGame.values()) {
    const gameMods = gameRows[0].gameMods;
    const scores = gameRows.map((row) => ({ mods: row.scoreMods }));

    if (!deriveGameIsFreeMod(gameMods, scores)) continue;

    freemodGameCount += 1;
    for (const row of gameRows) {
      freemodScoreCount += row.scoreCount;
      countsByMods.set(
        row.scoreMods,
        (countsByMods.get(row.scoreMods) ?? 0) + row.scoreCount
      );
    }
  }

  const distribution = Array.from(countsByMods, ([mods, scoreCount]) => ({
    mods,
    scoreCount,
    percentage:
      freemodScoreCount > 0 ? (scoreCount / freemodScoreCount) * 100 : 0,
  })).sort(
    (left, right) =>
      right.scoreCount - left.scoreCount || left.mods - right.mods
  );

  return { freemodGameCount, freemodScoreCount, distribution };
}

export interface RankRangeModRow {
  /** Raw `tournaments.rankRangeLowerBound` of the score's tournament. */
  rankRangeLowerBound: number;
  /** Normalized display mods (NF/SO stripped, NC folded into DT). */
  mods: number;
  /** Verified scores with that bound and mod combination. */
  scoreCount: number;
}

/**
 * Folds per-(rank range, normalized mods) counts into one distribution per
 * bucket. Rows use the same tie-break as the global mod distribution.
 */
export function summarizeRankRangeMods(
  rows: ReadonlyArray<RankRangeModRow>
): BeatmapRankRangeModDistribution[] {
  const countsByBucket = new Map<RankRangeBucketKey, Map<number, number>>();

  for (const row of rows) {
    const key = getRankRangeBucketKey(row.rankRangeLowerBound);
    if (key == null) continue;

    const byMods = countsByBucket.get(key) ?? new Map<number, number>();
    byMods.set(row.mods, (byMods.get(row.mods) ?? 0) + row.scoreCount);
    countsByBucket.set(key, byMods);
  }

  const buckets: BeatmapRankRangeModDistribution[] = [];

  for (const definition of RANK_RANGE_BUCKETS) {
    const byMods = countsByBucket.get(definition.key);
    if (!byMods) continue;

    const scoreCount = Array.from(byMods.values()).reduce(
      (total, count) => total + count,
      0
    );
    if (scoreCount <= 0) continue;

    buckets.push({
      rankRange: definition.key,
      scoreCount,
      distribution: Array.from(byMods, ([mods, count]) => ({
        mods,
        scoreCount: count,
        percentage: (count / scoreCount) * 100,
      })).sort(
        (left, right) =>
          right.scoreCount - left.scoreCount || left.mods - right.mods
      ),
    });
  }

  return buckets;
}

/**
 * Ascending tier boundaries above Bronze: every `tierData` baseRating except
 * Bronze's, so `width_bucket(rating, TIER_RATING_BOUNDARIES)` yields an index
 * into {@link tierNames}. Derived from tierData — never hard-coded.
 */
export const TIER_RATING_BOUNDARIES: readonly number[] = tierData
  .slice(1)
  .map((tier) => tier.baseRating);

/**
 * Pure-arithmetic mirror of the SQL `width_bucket` expression used by the tier
 * breakdown query. Index 0 (Bronze) covers everything below the first boundary
 * including sub-100 ratings, matching `getTierFromRating`; a parity test
 * asserts both stay in sync.
 */
export function tierNameFromRatingArithmetic(rating: number): TierName {
  let index = 0;
  for (const bound of TIER_RATING_BOUNDARIES) {
    if (rating >= bound) index += 1;
  }

  return tierNames[index];
}

/**
 * Highest tier index the beatmap tier breakdown reports. Elite Grandmaster is
 * folded into Grandmaster: a single beatmap rarely carries enough scores at the
 * very top of the ladder for its own quartiles to mean anything, so both share
 * one bucket rendered as "Grandmaster+".
 */
export const TIER_BREAKDOWN_MAX_TIER_INDEX = tierNames.indexOf('Grandmaster');

/**
 * Tier a rating lands in for the breakdown, with the Elite Grandmaster fold
 * applied. Mirrors the clamped `width_bucket` expression in the SQL; a parity
 * test keeps both in sync.
 */
export function tierBreakdownTierFromRating(rating: number): TierName {
  let index = 0;
  for (const bound of TIER_RATING_BOUNDARIES) {
    if (rating >= bound) index += 1;
  }

  return tierNames[Math.min(index, TIER_BREAKDOWN_MAX_TIER_INDEX)];
}

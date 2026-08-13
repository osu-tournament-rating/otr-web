import type { Ruleset } from '@otr/core/osu';

import {
  CLOSENESS_BASELINES,
  type BaselineScope,
  type ClosenessBaseline,
  type ZDecileEdges,
} from '@/lib/beatmaps/closeness-baselines';

/**
 * Read-time closeness statistics for one beatmap.
 *
 * Every game contributes `logRatio = ln(winning score / losing score)`,
 * standardized against its own cohort baseline so games from different rulesets
 * and team sizes pool onto one scale. Standardizing fixes the total variance of
 * `z` at 1, which is why the between-map variance of `z` is the cohort ICC and
 * the shrinkage constant is `(1 - icc) / icc`. A map spanning several cohorts
 * contributes rows to each and pools through that scale.
 */

/** Games a map needs before the card bins its distribution or states a verdict. */
export const CLOSENESS_MIN_GAMES = 10;

/** Reliability a map needs before the card states a percentile. */
export const CLOSENESS_MIN_RELIABILITY = 0.5;

/** Two-sided 80% normal quantile. */
const INTERVAL_Z = 1.2816;

export interface ClosenessGame {
  /** `ln(winning score / losing score)` for one game. */
  logRatio: number;
  /** `games.ruleset`, never the beatmap's own ruleset — they disagree. */
  ruleset: Ruleset;
  /** Players per team, capped at 5. */
  teamSize: number;
}

export interface ScoredClosenessGame extends ClosenessGame {
  /** `(logRatio - meanLogRatio) / sdLogRatio` against this game's baseline. */
  z: number;
}

/** The cohort the map mostly played in, and the baseline that resolved for it. */
export interface ClosenessCohort {
  ruleset: Ruleset;
  teamSize: number;
  baselineScope: BaselineScope;
  meanLogRatio: number;
  sdLogRatio: number;
}

export interface ClosenessSummary {
  gameCount: number;
  excludedUnverifiedGameCount: number;
  /** Null only when the map has no qualifying games. */
  cohort: ClosenessCohort | null;
  /** `rho = N / (N + k)`, the weight the map's own games carry. */
  reliability: number | null;
  /** Unshrunk mean of the standardized log ratios. */
  meanZ: number | null;
  /** `rho * meanZ`, the posterior mean this map's percentile reads off. */
  shrunkZ: number | null;
  /** 0-100. Null until the map clears both reliability gates. */
  percentile: number | null;
  /** 80% interval around `percentile`, on the same 0-100 scale. */
  percentileInterval: [number, number] | null;
  /** Ten counts split by `baselineZDeciles`. Empty below `CLOSENESS_MIN_GAMES`. */
  bins: number[];
  /** The dominant cohort's decile edges, for the chart's reference band. */
  baselineZDeciles: ZDecileEdges | null;
  games: ScoredClosenessGame[];
}

/** Abramowitz-Stegun 7.1.26. Absolute error at most 1.5e-7. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const absolute = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * absolute);
  const series =
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
    t;
  return sign * (1 - series * Math.exp(-absolute * absolute));
}

/** Standard normal CDF. */
export function normalCdf(z: number): number {
  return Math.min(1, Math.max(0, 0.5 * (1 + erf(z / Math.SQRT2))));
}

function findGlobalBaseline(): ClosenessBaseline {
  for (const row of CLOSENESS_BASELINES) {
    if (row.scope === 'global') return row;
  }
  throw new Error('closeness baselines are missing the global row');
}

const GLOBAL_BASELINE = findGlobalBaseline();

/**
 * The fitted cohort cell, falling back to the ruleset row and then to the
 * global row. Cells thinner than `MIN_COHORT_GAMES` have no row of their own.
 */
export function lookupBaseline(
  ruleset: Ruleset,
  teamSize: number
): ClosenessBaseline {
  let rulesetRow: ClosenessBaseline | undefined;

  for (const row of CLOSENESS_BASELINES) {
    if (row.ruleset !== ruleset) continue;
    if (row.scope === 'cohort' && row.teamSize === teamSize) return row;
    if (row.scope === 'ruleset') rulesetRow = row;
  }

  return rulesetRow ?? GLOBAL_BASELINE;
}

interface CohortTally {
  ruleset: Ruleset;
  teamSize: number;
  gameCount: number;
}

/** Most-played cohort, tie-broken by ruleset then team size so it is stable. */
function pickDominantCohort(
  tallies: Iterable<CohortTally>
): CohortTally | null {
  let best: CohortTally | null = null;

  for (const tally of tallies) {
    if (
      best === null ||
      tally.gameCount > best.gameCount ||
      (tally.gameCount === best.gameCount &&
        (tally.ruleset < best.ruleset ||
          (tally.ruleset === best.ruleset && tally.teamSize < best.teamSize)))
    ) {
      best = tally;
    }
  }

  return best;
}

function binByDecile(
  games: readonly ScoredClosenessGame[],
  edges: ZDecileEdges
): number[] {
  const bins = new Array<number>(edges.length + 1).fill(0);

  for (const game of games) {
    let index = 0;
    while (index < edges.length && game.z >= edges[index]) index++;
    bins[index] += 1;
  }

  return bins;
}

const EMPTY_SUMMARY = {
  cohort: null,
  reliability: null,
  meanZ: null,
  shrunkZ: null,
  percentile: null,
  percentileInterval: null,
  baselineZDeciles: null,
} as const;

/**
 * Pools a map's games into one closeness verdict.
 *
 * `excludedUnverifiedGameCount` is reported back untouched so the card can say
 * why a map has fewer games than its play count suggests.
 */
export function summarizeCloseness(
  games: readonly ClosenessGame[],
  excludedUnverifiedGameCount: number
): ClosenessSummary {
  const scored: ScoredClosenessGame[] = [];
  const tallies = new Map<string, CohortTally>();
  let sumZ = 0;
  let sumK = 0;
  let sumIcc = 0;

  for (const game of games) {
    const baseline = lookupBaseline(game.ruleset, game.teamSize);
    const z = (game.logRatio - baseline.meanLogRatio) / baseline.sdLogRatio;

    scored.push({ ...game, z });
    sumZ += z;
    sumK += baseline.shrinkageK;
    sumIcc += baseline.icc;

    const key = `${game.ruleset}:${game.teamSize}`;
    const tally = tallies.get(key);
    if (tally) tally.gameCount += 1;
    else
      tallies.set(key, {
        ruleset: game.ruleset,
        teamSize: game.teamSize,
        gameCount: 1,
      });
  }

  const gameCount = scored.length;
  const dominant = pickDominantCohort(tallies.values());

  if (gameCount === 0 || dominant === null) {
    return {
      ...EMPTY_SUMMARY,
      gameCount: 0,
      excludedUnverifiedGameCount,
      bins: [],
      games: [],
    };
  }

  const baseline = lookupBaseline(dominant.ruleset, dominant.teamSize);
  const meanZ = sumZ / gameCount;
  const shrinkageK = sumK / gameCount;
  const icc = sumIcc / gameCount;
  const reliability = gameCount / (gameCount + shrinkageK);
  const shrunkZ = reliability * meanZ;
  const tauZ = Math.sqrt(icc);
  const halfWidth =
    INTERVAL_Z * tauZ * Math.sqrt(shrinkageK / (gameCount + shrinkageK));

  const gated =
    tauZ > 0 &&
    gameCount >= CLOSENESS_MIN_GAMES &&
    reliability >= CLOSENESS_MIN_RELIABILITY;

  return {
    gameCount,
    excludedUnverifiedGameCount,
    cohort: {
      ruleset: dominant.ruleset,
      teamSize: dominant.teamSize,
      baselineScope: baseline.scope,
      meanLogRatio: baseline.meanLogRatio,
      sdLogRatio: baseline.sdLogRatio,
    },
    reliability,
    meanZ,
    shrunkZ,
    percentile: gated ? normalCdf(shrunkZ / tauZ) * 100 : null,
    percentileInterval: gated
      ? [
          normalCdf((shrunkZ - halfWidth) / tauZ) * 100,
          normalCdf((shrunkZ + halfWidth) / tauZ) * 100,
        ]
      : null,
    bins:
      gameCount >= CLOSENESS_MIN_GAMES
        ? binByDecile(scored, baseline.zDecileEdges)
        : [],
    baselineZDeciles: baseline.zDecileEdges,
    games: scored,
  };
}

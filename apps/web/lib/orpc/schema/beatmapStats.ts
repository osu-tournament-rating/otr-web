import { z } from 'zod';

import { RANK_RANGE_BUCKET_KEYS } from '@/lib/beatmaps/rankRange';
import { tierNames } from '@/lib/utils/tierData';

import { beatmapSelectSchema, beatmapsetSelectSchema } from './base';
import {
  CreatedUpdatedOmit,
  RulesetSchema,
  ScoreGradeSchema,
  VerificationStatusSchema,
} from './constants';
import { PlayerCompactSchema } from './playerStats';

/** Tournament rank-range bracket, keyed by `lib/beatmaps/rankRange`. */
export const RankRangeBucketKeySchema = z.enum(RANK_RANGE_BUCKET_KEYS);

/** Rating tier name, keyed by `lib/utils/tierData`. */
export const TierNameSchema = z.enum(tierNames);

export const BeatmapStatsRequestSchema = z.object({
  id: z.number().int().positive(),
});

export const BeatmapTournamentUsageSchema = z.object({
  tournament: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    abbreviation: z.string().nullable(),
    ruleset: RulesetSchema,
    lobbySize: z.number().int().positive(),
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
    verificationStatus: VerificationStatusSchema,
    isLazer: z.boolean(),
  }),
  gameCount: z.number().int().nonnegative(),
  /** Verified scores set on this beatmap within the tournament. */
  scoreCount: z.number().int().nonnegative(),
  mostCommonMod: z.number().int().nonnegative(),
  mostCommonModFreemod: z.boolean(),
  firstPlayedAt: z.string().nullable(),
  rankRangeLowerBound: z.number().int().positive(),
  avgRating: z.number().nullable(),
  avgScore: z.number().int().nonnegative().nullable(),
});

export const BeatmapUsagePointSchema = z.object({
  quarter: z.string(),
  gameCount: z.number().int().nonnegative(),
  pooledCount: z.number().int().nonnegative(),
});

export const BeatmapModDistributionSchema = z.object({
  mods: z.number().int().nonnegative(),
  scoreCount: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const BeatmapTopPerformerSchema = z.object({
  player: PlayerCompactSchema,
  score: z.number().int().nonnegative(),
  grade: ScoreGradeSchema.optional(),
  accuracy: z.number().min(0).max(100).nullable(),
  mods: z.number().int().nonnegative(),
  playedAt: z.string().nullable(),
  matchId: z.number().int().positive(),
  gameId: z.number().int().positive(),
  scoreId: z.number().int().positive(),
  /** Tournament the score was set in. */
  tournament: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    abbreviation: z.string().nullable(),
  }),
});

export const BeatmapStatsSummarySchema = z.object({
  /** Fully verified games. The population every statistic on the page uses. */
  totalGameCount: z.number().int().nonnegative(),
  /** Tournaments that pooled this beatmap, verified or not. */
  totalTournamentCount: z.number().int().nonnegative(),
  /** Subset of `totalTournamentCount` whose tournament is verified. */
  verifiedTournamentCount: z.number().int().nonnegative(),
  /**
   * Games credited as real-world usage: fully verified games, plus every game
   * in a tournament that is not verified. Tournaments get rejected for format
   * reasons while still being genuine play, so the map keeps credit for those.
   *
   * A game rejected on its own merits inside a verified tournament is NOT
   * credited — there the reviewer judged that specific game, and the carve-out
   * does not apply. Never use this as a statistical population.
   */
  totalPlayedGameCount: z.number().int().nonnegative(),
  /**
   * Pool records where the beatmap was played at least once. Always <=
   * `totalTournamentCount`, so the two form a pick rate.
   */
  pooledPlayedTournamentCount: z.number().int().nonnegative(),
  totalPlayerCount: z.number().int().nonnegative(),
  firstPlayedAt: z.string().nullable(),
  lastPlayedAt: z.string().nullable(),
});

const BeatmapsetForStatsSchema = beatmapsetSelectSchema
  .omit(CreatedUpdatedOmit)
  .extend({
    creator: PlayerCompactSchema.nullable(),
  });

const BeatmapForStatsSchema = beatmapSelectSchema
  .omit(CreatedUpdatedOmit)
  .extend({
    ruleset: RulesetSchema,
    beatmapset: BeatmapsetForStatsSchema.nullable(),
  });

export const BeatmapWithDetailsSchema = BeatmapForStatsSchema.extend({
  creators: z.array(PlayerCompactSchema),
});

export const RelatedBeatmapDifficultySchema = z.object({
  osuId: z.number().int().positive(),
  diffName: z.string(),
  ruleset: RulesetSchema,
  sr: z.number().nonnegative(),
});

/** Five-number summary of verified scores for one normalized mod combination. */
export const BeatmapModScoreDistributionSchema = z.object({
  /** Normalized display mods bitmask (NF/SO stripped, NC folded into DT). */
  mods: z.number().int().nonnegative(),
  scoreCount: z.number().int().positive(),
  minScore: z.number().int().nonnegative(),
  p25Score: z.number().int().nonnegative(),
  medianScore: z.number().int().nonnegative(),
  p75Score: z.number().int().nonnegative(),
  maxScore: z.number().int().nonnegative(),
});

/** One point of the verified-score CDF: `score` beats `percentile`% of plays. */
export const BeatmapScorePercentilePointSchema = z.object({
  percentile: z.number().min(0).max(100),
  score: z.number().int().nonnegative(),
});

export const BeatmapScoreSamplePointSchema = z.object({
  score: z.number().int().nonnegative(),
  /**
   * Raw stored fraction (0–1) from gameScores.accuracy, matching
   * `topPerformers[].accuracy` on this response; multiply by 100 for display.
   */
  accuracy: z.number().min(0).max(100),
  /**
   * Pre-match rating (rating_adjustments.rating_before); null is expected and
   * clusters on recent data.
   */
  rating: z.number().nullable(),
  /** Raw score mods bitmask (client normalizes for color/label). */
  mods: z.number().int().nonnegative(),
  /** Rank-range bucket of the tournament the score's match belongs to. */
  rankRange: RankRangeBucketKeySchema,
});

export const BeatmapScoreSampleSchema = z.object({
  /** Total verified scores the sample was drawn from. */
  totalScoreCount: z.number().int().nonnegative(),
  /** Deterministic sample, capped at 1000, ordered by score id ascending. */
  points: z.array(BeatmapScoreSamplePointSchema),
});

export const BeatmapMissBucketSchema = z.object({
  /** 0..5; 5 means "5 or more". */
  misses: z.number().int().min(0).max(5),
  scoreCount: z.number().int().nonnegative(),
});

export const BeatmapGradeCountSchema = z.object({
  grade: ScoreGradeSchema,
  scoreCount: z.number().int().nonnegative(),
});

export const BeatmapPerformanceSummarySchema = z.object({
  scoreCount: z.number().int().nonnegative(),
  /** Scores with a non-null stat_miss (denominator for missDistribution). */
  missDataScoreCount: z.number().int().nonnegative(),
  missDistribution: z.array(BeatmapMissBucketSchema),
  gradeDistribution: z.array(BeatmapGradeCountSchema),
});

export const BeatmapFreemodPickSummarySchema = z.object({
  /** Verified games on this map detected as freemod. */
  freemodGameCount: z.number().int().nonnegative(),
  /** Verified scores inside those games. */
  freemodScoreCount: z.number().int().nonnegative(),
  /** Reuses the existing mod-distribution row shape (raw score mods). */
  distribution: z.array(BeatmapModDistributionSchema),
});

/** Verified-score mod split within one tournament rank-range bucket. */
export const BeatmapRankRangeModDistributionSchema = z.object({
  rankRange: RankRangeBucketKeySchema,
  /** Verified scores in this bucket (denominator for the rows' percentages). */
  scoreCount: z.number().int().positive(),
  /** Normalized display-mod rows (NF/SO stripped, NC→DT), desc by scoreCount. */
  distribution: z.array(BeatmapModDistributionSchema),
});

/**
 * Score/accuracy summary for verified scores whose player sat in this tier at
 * time of play (pre-match rating, `rating_adjustments.rating_before`).
 */
export const BeatmapTierScoreSummarySchema = z.object({
  /**
   * Elite Grandmaster is folded into Grandmaster, so this never reports
   * `'Elite Grandmaster'`; the merged bucket renders as "Grandmaster+".
   */
  tier: TierNameSchema,
  scoreCount: z.number().int().positive(),
  minScore: z.number().int().nonnegative(),
  p25Score: z.number().int().nonnegative(),
  medianScore: z.number().int().nonnegative(),
  p75Score: z.number().int().nonnegative(),
  maxScore: z.number().int().nonnegative(),
  /**
   * Accuracy quartiles as raw stored fractions (0–1), matching
   * `scoreSample.points[].accuracy`. All five are null together, when no row in
   * the tier has accuracy recorded.
   */
  minAccuracy: z.number().min(0).max(1).nullable(),
  p25Accuracy: z.number().min(0).max(1).nullable(),
  medianAccuracy: z.number().min(0).max(1).nullable(),
  p75Accuracy: z.number().min(0).max(1).nullable(),
  maxAccuracy: z.number().min(0).max(1).nullable(),
});

export const BeatmapTierBreakdownSchema = z.object({
  /** Verified scores with a pre-match rating (rating_adjustments.rating_before). */
  ratedScoreCount: z.number().int().nonnegative(),
  /** All verified scores, for the "X of Y rated" caption. */
  totalScoreCount: z.number().int().nonnegative(),
  /**
   * Ascending by tier (Bronze → Grandmaster+); only tiers with at least five
   * scores.
   */
  tiers: z.array(BeatmapTierScoreSummarySchema),
});

export const BeatmapMarginBucketSchema = z.object({
  /** Inclusive lower bound of the relative margin bucket, percent. */
  lowerBound: z.number().min(0),
  /** Exclusive upper bound, percent; null on the open-ended last bucket. */
  upperBound: z.number().nullable(),
  gameCount: z.number().int().nonnegative(),
});

export const BeatmapTeamVsMarginSummarySchema = z.object({
  /** Verified TeamVs games on this map with exactly two rosters. */
  gameCount: z.number().int().nonnegative(),
  /** Median relative margin percent; null when gameCount is 0. */
  medianMarginPercentage: z.number().nullable(),
  /** Fixed ascending buckets; always all buckets, possibly 0. */
  buckets: z.array(BeatmapMarginBucketSchema),
});

export const BeatmapStatsResponseSchema = z.object({
  beatmap: BeatmapWithDetailsSchema,
  relatedDifficulties: z.array(RelatedBeatmapDifficultySchema),
  summary: BeatmapStatsSummarySchema,
  usageOverTime: z.array(BeatmapUsagePointSchema),
  tournaments: z.array(BeatmapTournamentUsageSchema),
  modDistribution: z.array(BeatmapModDistributionSchema),
  topPerformers: z.array(BeatmapTopPerformerSchema),
  scoreDistribution: z.array(BeatmapModScoreDistributionSchema),
  scorePercentiles: z.array(BeatmapScorePercentilePointSchema),
  scoreSample: BeatmapScoreSampleSchema,
  performance: BeatmapPerformanceSummarySchema,
  freemodPicks: BeatmapFreemodPickSummarySchema,
  /** Bucket display order; buckets with no verified scores are omitted. */
  rankRangeModDistribution: z.array(BeatmapRankRangeModDistributionSchema),
  tierBreakdown: BeatmapTierBreakdownSchema,
  teamVsMargins: BeatmapTeamVsMarginSummarySchema,
});

export type BeatmapStatsRequest = z.infer<typeof BeatmapStatsRequestSchema>;
export type BeatmapTournamentUsage = z.infer<
  typeof BeatmapTournamentUsageSchema
>;
export type BeatmapUsagePoint = z.infer<typeof BeatmapUsagePointSchema>;
export type BeatmapModDistribution = z.infer<
  typeof BeatmapModDistributionSchema
>;
export type BeatmapTopPerformer = z.infer<typeof BeatmapTopPerformerSchema>;
export type BeatmapStatsSummary = z.infer<typeof BeatmapStatsSummarySchema>;
export type BeatmapWithDetails = z.infer<typeof BeatmapWithDetailsSchema>;
export type RelatedBeatmapDifficulty = z.infer<
  typeof RelatedBeatmapDifficultySchema
>;
export type BeatmapModScoreDistribution = z.infer<
  typeof BeatmapModScoreDistributionSchema
>;
export type BeatmapScorePercentilePoint = z.infer<
  typeof BeatmapScorePercentilePointSchema
>;
export type BeatmapScoreSamplePoint = z.infer<
  typeof BeatmapScoreSamplePointSchema
>;
export type BeatmapScoreSample = z.infer<typeof BeatmapScoreSampleSchema>;
export type BeatmapMissBucket = z.infer<typeof BeatmapMissBucketSchema>;
export type BeatmapGradeCount = z.infer<typeof BeatmapGradeCountSchema>;
export type BeatmapPerformanceSummary = z.infer<
  typeof BeatmapPerformanceSummarySchema
>;
export type BeatmapFreemodPickSummary = z.infer<
  typeof BeatmapFreemodPickSummarySchema
>;
export type BeatmapRankRangeModDistribution = z.infer<
  typeof BeatmapRankRangeModDistributionSchema
>;
export type BeatmapTierScoreSummary = z.infer<
  typeof BeatmapTierScoreSummarySchema
>;
export type BeatmapTierBreakdown = z.infer<typeof BeatmapTierBreakdownSchema>;
export type BeatmapMarginBucket = z.infer<typeof BeatmapMarginBucketSchema>;
export type BeatmapTeamVsMarginSummary = z.infer<
  typeof BeatmapTeamVsMarginSummarySchema
>;
export type BeatmapStatsResponse = z.infer<typeof BeatmapStatsResponseSchema>;

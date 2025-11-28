import { z } from 'zod/v4';

import { beatmapSelectSchema, beatmapsetSelectSchema } from './base';
import { CreatedUpdatedOmit, RulesetSchema, VerificationStatusSchema } from './constants';
import { PlayerCompactSchema } from './playerStats';

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
  mostCommonMod: z.number().int().nonnegative(),
  firstPlayedAt: z.string().nullable(),
});

export const BeatmapUsagePointSchema = z.object({
  quarter: z.string(),
  gameCount: z.number().int().nonnegative(),
  pooledCount: z.number().int().nonnegative(),
});

export const BeatmapModDistributionSchema = z.object({
  mods: z.number().int().nonnegative(),
  gameCount: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
});

export const BeatmapScoreRatingPointSchema = z.object({
  score: z.number().int().nonnegative(),
  playerRating: z.number(),
  mods: z.number().int().nonnegative(),
});

export const BeatmapModTrendSchema = z.object({
  month: z.string(),
  mods: z.number().int().nonnegative(),
  gameCount: z.number().int().nonnegative(),
});

export const BeatmapTopPerformerSchema = z.object({
  player: PlayerCompactSchema,
  score: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(100).nullable(),
  mods: z.number().int().nonnegative(),
  playedAt: z.string().nullable(),
});

export const BeatmapStatsSummarySchema = z.object({
  totalGameCount: z.number().int().nonnegative(),
  totalTournamentCount: z.number().int().nonnegative(),
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

export const BeatmapStatsResponseSchema = z.object({
  beatmap: BeatmapWithDetailsSchema,
  summary: BeatmapStatsSummarySchema,
  usageOverTime: z.array(BeatmapUsagePointSchema),
  tournaments: z.array(BeatmapTournamentUsageSchema),
  modDistribution: z.array(BeatmapModDistributionSchema),
  scoreRatingData: z.array(BeatmapScoreRatingPointSchema),
  modTrend: z.array(BeatmapModTrendSchema),
  topPerformers: z.array(BeatmapTopPerformerSchema),
});

export type BeatmapStatsRequest = z.infer<typeof BeatmapStatsRequestSchema>;
export type BeatmapTournamentUsage = z.infer<typeof BeatmapTournamentUsageSchema>;
export type BeatmapUsagePoint = z.infer<typeof BeatmapUsagePointSchema>;
export type BeatmapModDistribution = z.infer<typeof BeatmapModDistributionSchema>;
export type BeatmapScoreRatingPoint = z.infer<typeof BeatmapScoreRatingPointSchema>;
export type BeatmapModTrend = z.infer<typeof BeatmapModTrendSchema>;
export type BeatmapTopPerformer = z.infer<typeof BeatmapTopPerformerSchema>;
export type BeatmapStatsSummary = z.infer<typeof BeatmapStatsSummarySchema>;
export type BeatmapWithDetails = z.infer<typeof BeatmapWithDetailsSchema>;
export type BeatmapStatsResponse = z.infer<typeof BeatmapStatsResponseSchema>;

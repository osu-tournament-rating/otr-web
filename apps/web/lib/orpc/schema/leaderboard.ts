import { z } from 'zod/v4';

import { playerRatingSelectSchema, playerSelectSchema } from './base';
import { RulesetSchema } from './constants';

export const leaderboardTierKeys = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'eliteGrandmaster',
] as const;

export const LeaderboardTierKeySchema = z.enum(leaderboardTierKeys);

export const TierProgressSchema = z.object({
  currentTier: z.string(),
  currentSubTier: z.number().int().min(1).max(3).nullable(),
  nextTier: z.string().nullable(),
  nextSubTier: z.number().int().min(1).max(3).nullable(),
  ratingForNextTier: z.number(),
  ratingForNextMajorTier: z.number(),
  nextMajorTier: z.string().nullable(),
  subTierFillPercentage: z.number().min(0).max(1).nullable(),
  majorTierFillPercentage: z.number().min(0).max(1).nullable(),
});

export const LeaderboardPlayerSchema = playerSelectSchema.pick({
  id: true,
  osuId: true,
  username: true,
  country: true,
});

const leaderboardRatingBaseSchema = playerRatingSelectSchema
  .pick({
    ruleset: true,
    rating: true,
    volatility: true,
    percentile: true,
    globalRank: true,
    countryRank: true,
  })
  .extend({
    ruleset: RulesetSchema,
  });

export const LeaderboardEntrySchema = leaderboardRatingBaseSchema.extend({
  player: LeaderboardPlayerSchema,
  countryRank: z.number().int().nonnegative(),
  tournamentsPlayed: z.number().int().nonnegative(),
  matchesPlayed: z.number().int().nonnegative(),
  winRate: z.number().min(0).max(1),
  tier: LeaderboardTierKeySchema,
  tierProgress: TierProgressSchema,
});

export const LeaderboardRequestSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  ruleset: RulesetSchema.optional(),
  country: z.string().trim().min(2).max(4).optional(),
  minOsuRank: z.number().int().min(1).optional(),
  maxOsuRank: z.number().int().min(1).optional(),
  minRating: z.number().int().min(0).optional(),
  maxRating: z.number().int().min(0).optional(),
  minMatches: z.number().int().min(1).optional(),
  maxMatches: z.number().int().min(1).optional(),
  minWinRate: z.number().min(0).max(1).optional(),
  maxWinRate: z.number().min(0).max(1).optional(),
  tiers: LeaderboardTierKeySchema.array().optional(),
  friend: z.boolean().optional(),
  userId: z.number().int().min(1).optional(),
});

export const LeaderboardResponseSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  pages: z.number().int().min(0),
  total: z.number().int().nonnegative(),
  ruleset: RulesetSchema,
  leaderboard: LeaderboardEntrySchema.array(),
});

export type LeaderboardTierKey = z.infer<typeof LeaderboardTierKeySchema>;
export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;
export type LeaderboardRequest = z.infer<typeof LeaderboardRequestSchema>;
export type LeaderboardResponse = z.infer<typeof LeaderboardResponseSchema>;

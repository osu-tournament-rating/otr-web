import { z } from 'zod/v4';

import { RulesetSchema } from './constants';

export const PlayerRatingsInputSchema = z.object({
  osuIds: z.array(z.number().int().positive()).min(1).max(50),
  ruleset: RulesetSchema,
});

export const PlayerRatingEntrySchema = z.object({
  osuId: z.number().int().positive(),
  rating: z.number(),
  volatility: z.number(),
  peakRating: z.number(),
  verifiedTournamentsPlayed: z.number().int().nonnegative(),
  verifiedMatchesPlayed: z.number().int().nonnegative(),
  percentile: z.number(),
  tier: z.string(),
  subTier: z.number().int().min(1).max(3),
});

export const PlayerRatingsResponseSchema =
  PlayerRatingEntrySchema.array();

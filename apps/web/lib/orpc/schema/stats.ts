import { z } from 'zod';

import { Ruleset, VerificationStatus } from '@otr/core/osu';
import {
  PLAYER_STATS_RULESETS,
  PlayerStatsSchema,
} from '@otr/core/stats/player-stats';

const verificationStatusKeyOptions = [
  `${VerificationStatus.None}`,
  `${VerificationStatus.PreRejected}`,
  `${VerificationStatus.PreVerified}`,
  `${VerificationStatus.Rejected}`,
  `${VerificationStatus.Verified}`,
] as const;

const rulesetKeyOptions = [
  `${Ruleset.Osu}`,
  `${Ruleset.Taiko}`,
  `${Ruleset.Catch}`,
  `${Ruleset.ManiaOther}`,
  `${Ruleset.Mania4k}`,
  `${Ruleset.Mania7k}`,
] as const;

export const VerificationStatusKeySchema = z.enum(verificationStatusKeyOptions);
export type VerificationStatusKey =
  (typeof verificationStatusKeyOptions)[number];

export const RulesetKeySchema = z.enum(rulesetKeyOptions);
export type RulesetKey = (typeof rulesetKeyOptions)[number];

export const TournamentPlatformStatsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  countByVerificationStatus: z.record(
    VerificationStatusKeySchema,
    z.number().int().nonnegative()
  ),
  verifiedByYear: z.record(z.string(), z.number().int().nonnegative()),
  verifiedByRuleset: z.record(RulesetKeySchema, z.number().int().nonnegative()),
  verifiedByLobbySize: z.record(z.string(), z.number().int().nonnegative()),
});

export const RatingPlatformStatsSchema = z.object({
  ratingsByRuleset: z.record(
    RulesetKeySchema,
    z.record(z.string(), z.number().int().nonnegative())
  ),
});

export const UserPlatformStatsSchema = z.object({
  sumByDate: z.record(z.string(), z.number().int().nonnegative()),
});

export const PlatformStatsSchema = z.object({
  tournamentStats: TournamentPlatformStatsSchema,
  ratingStats: RatingPlatformStatsSchema,
  userStats: UserPlatformStatsSchema,
});

export type PlatformStats = z.infer<typeof PlatformStatsSchema>;

export const verificationStatusKeys = verificationStatusKeyOptions;
export const rulesetKeys = rulesetKeyOptions;

export const PlayerStatsRulesetSchema = z
  .literal(PLAYER_STATS_RULESETS)
  .describe('Ruleset with a player statistics snapshot');

export const PlayerStatsRequestSchema = z.object({
  ruleset: PlayerStatsRulesetSchema,
});

export const PlayerStatsResponseSchema = z.object({
  ruleset: PlayerStatsRulesetSchema,
  /** When the snapshot was built, or `null` while none exists yet. */
  generatedAt: z.string().nullable(),
  stats: PlayerStatsSchema.nullable(),
});

export type PlayerStatsRulesetValue = z.infer<typeof PlayerStatsRulesetSchema>;
export type PlayerStatsResponse = z.infer<typeof PlayerStatsResponseSchema>;

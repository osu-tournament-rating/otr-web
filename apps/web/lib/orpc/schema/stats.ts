import { z } from 'zod';

import { Ruleset, VerificationStatus } from '@otr/core/osu';

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

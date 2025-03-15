import {
  GameProcessingStatus,
  GameRejectionReason,
  GameWarningFlags,
  Mods,
  Ruleset,
  ScoringType,
  TeamType,
  TournamentProcessingStatus,
  TournamentRejectionReason,
  VerificationStatus,
} from '@osu-tournament-rating/otr-api-client';
import { EnumLike, z } from 'zod';

/** Schema that ensures a numeric input is assignable to a given BITWISE enumeration */
const bitwiseEnumValueSchema = <T extends EnumLike>(enumType: T) =>
  z.coerce.number().refine((val) => {
    const validFlags = Object.values(enumType).filter(
      (enumValue): enumValue is number => typeof enumValue === 'number'
    );
    const allFlags = validFlags.reduce((acc, flag) => acc | flag, 0);

    return validFlags.includes(val) || (val & ~allFlags) === 0;
  });

/** Schema that ensures a numeric input is assignable to a given enumeration */
const numericEnumValueSchema = <T extends EnumLike>(enumType: T) =>
  z.coerce.number().refine((val) => Object.values(enumType).includes(val));

export const tournamentEditFormSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  forumUrl: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith('https://osu.ppy.sh/community/forums/topics/') ||
        value.startsWith('https://osu.ppy.sh/wiki/en/Tournaments/'),
      {
        message:
          'Forum URL must be from "https://osu.ppy.sh/community/forums/topics/" or "https://osu.ppy.sh/wiki/en/Tournaments/"',
      }
    ),
  rankRangeLowerBound: z.coerce.number().min(1),
  lobbySize: z.coerce.number().min(1).max(8),
  ruleset: numericEnumValueSchema(Ruleset),
  verificationStatus: numericEnumValueSchema(VerificationStatus),
  rejectionReason: bitwiseEnumValueSchema(TournamentRejectionReason),
  processingStatus: numericEnumValueSchema(TournamentProcessingStatus),
});

export const matchEditFormSchema = z.object({
  name: z.string().min(1),
  verificationStatus: numericEnumValueSchema(VerificationStatus),
  rejectionReason: bitwiseEnumValueSchema(TournamentRejectionReason),
  processingStatus: numericEnumValueSchema(TournamentProcessingStatus),
  warningFlags: bitwiseEnumValueSchema(GameWarningFlags),
});

export const gameEditFormSchema = z.object({
  scoringType: numericEnumValueSchema(ScoringType),
  teamType: numericEnumValueSchema(TeamType),
  mods: bitwiseEnumValueSchema(Mods),
  ruleset: numericEnumValueSchema(Ruleset),
  verificationStatus: numericEnumValueSchema(VerificationStatus),
  warningFlags: bitwiseEnumValueSchema(GameWarningFlags),
  rejectionReason: bitwiseEnumValueSchema(GameRejectionReason),
  processingStatus: numericEnumValueSchema(GameProcessingStatus),
});

export const adminNoteFormSchema = z.object({
  note: z.string().min(1),
});

export const leaderboardFilterSchema = z.object({
  minRank: z.number().min(1).optional(),
  maxRank: z.number().min(1).optional(),
  minRating: z.number().min(100).max(3500).optional(),
  maxRating: z.number().min(100).max(3500).optional(),
  minMatches: z.number().min(1).optional(),
  maxMatches: z.number().min(1).optional(),
  minWinrate: z.number().min(0).max(1).optional(),
  maxWinrate: z.number().min(0).max(1).optional(),
  tiers: z
    .array(
      z.enum([
        'bronze',
        'silver',
        'gold',
        'platinum',
        'emerald',
        'diamond',
        'master',
        'grandmaster',
        'eliteGrandmaster',
      ])
    )
    .optional(),
});

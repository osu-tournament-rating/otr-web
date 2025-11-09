import {
  GameRejectionReason,
  GameWarningFlags,
  MatchRejectionReason,
  MatchWarningFlags,
  Mods,
  Ruleset,
  ScoreGrade,
  ScoreRejectionReason,
  ScoringType,
  Team,
  TeamType,
  TournamentQuerySortType,
  TournamentRejectionReason,
  VerificationStatus,
} from '@otr/core/osu';
import { EnumLike, z } from 'zod';
import { leaderboardTierFilterValues } from './utils/leaderboard';
import { TournamentListFilter } from './types';

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
  z.coerce
    .number({ invalid_type_error: 'Required' })
    .refine((val) => Object.values(enumType).includes(val));

/** Schema that will convert string input of 'true' or 'false' to a boolean */
const booleanStringSchema = z
  .string()
  .toLowerCase()
  .refine((val) => val === 'true' || val === 'false')
  .transform((val) => val === 'true');

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
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
});

export const defaultTournamentListFilter: Partial<TournamentListFilter> = {
  verified: false,
  sort: TournamentQuerySortType.EndTime,
  descending: true,
};

export const tournamentListFilterSchema = z.object({
  verified: z.union([z.boolean(), booleanStringSchema]).catch(false),
  ruleset: numericEnumValueSchema(Ruleset).optional(),
  searchQuery: z.string().catch(''),
  dateMin: z.coerce.date().optional(),
  dateMax: z.coerce.date().optional(),
  verificationStatus: numericEnumValueSchema(VerificationStatus).optional(),
  rejectionReason: bitwiseEnumValueSchema(TournamentRejectionReason).optional(),
  submittedBy: z.coerce.number().optional(),
  verifiedBy: z.coerce.number().optional(),
  lobbySize: z.coerce.number().min(1).max(8).optional(),
  sort: numericEnumValueSchema(TournamentQuerySortType).catch(
    TournamentQuerySortType.EndTime
  ),
  descending: z.union([z.boolean(), booleanStringSchema]).catch(true),
});

export const matchEditFormSchema = z.object({
  name: z.string().min(1),
  verificationStatus: numericEnumValueSchema(VerificationStatus),
  rejectionReason: bitwiseEnumValueSchema(MatchRejectionReason),
  warningFlags: bitwiseEnumValueSchema(MatchWarningFlags),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
});

export const gameEditFormSchema = z.object({
  scoringType: numericEnumValueSchema(ScoringType),
  teamType: numericEnumValueSchema(TeamType),
  mods: bitwiseEnumValueSchema(Mods),
  ruleset: numericEnumValueSchema(Ruleset),
  verificationStatus: numericEnumValueSchema(VerificationStatus),
  warningFlags: bitwiseEnumValueSchema(GameWarningFlags),
  rejectionReason: bitwiseEnumValueSchema(GameRejectionReason),
  isFreeMod: z.boolean(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
});

export const scoreEditFormSchema = z.object({
  score: z.coerce.number().nonnegative().int(),
  placement: z.coerce.number().nonnegative().int(),
  maxCombo: z.coerce.number().nonnegative().int(),
  statGreat: z.coerce.number().nonnegative().int().nullable(),
  statOk: z.coerce.number().nonnegative().int().nullable(),
  statMeh: z.coerce.number().nonnegative().int().nullable(),
  statMiss: z.coerce.number().nonnegative().int().nullable(),
  statGood: z.coerce.number().nonnegative().int().nullable(),
  statPerfect: z.coerce.number().nonnegative().int().nullable(),
  accuracy: z.coerce.number().nonnegative(),
  grade: bitwiseEnumValueSchema(ScoreGrade),
  mods: bitwiseEnumValueSchema(Mods),
  ruleset: numericEnumValueSchema(Ruleset),
  verificationStatus: numericEnumValueSchema(VerificationStatus),
  rejectionReason: bitwiseEnumValueSchema(ScoreRejectionReason),
  team: numericEnumValueSchema(Team),
});

export const adminNoteFormSchema = z.object({
  note: z.string().min(1),
});

export const playerRatingChartFilterSchema = z.object({
  showDecay: z.boolean().default(true),
});

export const leaderboardFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  country: z.string().optional(),
  ruleset: numericEnumValueSchema(Ruleset).optional(),
  minOsuRank: z.coerce.number().int().min(1).optional(),
  maxOsuRank: z.coerce.number().int().min(1).optional(),
  minRating: z.coerce.number().int().min(100).max(3500).optional(),
  maxRating: z.coerce.number().int().min(100).max(3500).optional(),
  minMatches: z.coerce.number().int().min(1).optional(),
  maxMatches: z.coerce.number().int().min(1).optional(),
  minWinRate: z.coerce.number().min(0).max(100).optional(),
  maxWinRate: z.coerce.number().min(0).max(100).optional(),
  tiers: z.preprocess(
    (val) => {
      if (typeof val === 'string') {
        return [val as string];
      }

      return val;
    },
    z.array(z.enum(leaderboardTierFilterValues)).optional()
  ),
  friend: z.coerce.boolean().optional(),
  userId: z.coerce.number().min(1).optional(),
});

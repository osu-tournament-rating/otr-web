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
import { z } from 'zod';
import { leaderboardTierFilterValues } from './utils/leaderboard';
import { TournamentListFilter } from './types';
import { toRankRangeFilter } from '@/lib/filters/tournament-rank';

// Replaces zod v3's removed `EnumLike`.
type EnumLike = Record<string, string | number>;

/** Numeric input assignable to a bitwise enumeration. */
const bitwiseEnumValueSchema = <T extends EnumLike>(enumType: T) =>
  z.coerce.number().refine((val) => {
    const validFlags = Object.values(enumType).filter(
      (enumValue): enumValue is number => typeof enumValue === 'number'
    );
    const allFlags = validFlags.reduce((acc, flag) => acc | flag, 0);

    return validFlags.includes(val) || (val & ~allFlags) === 0;
  });

/** Numeric input assignable to an enumeration. */
const numericEnumValueSchema = <T extends EnumLike>(enumType: T) =>
  z.coerce
    .number({ error: 'Required' })
    .refine((val) => Object.values(enumType).includes(val));

/** Converts `'true'`/`'false'` to a boolean. */
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
  verificationStatus: [],
  lobbySize: [],
  minRankRange: 1,
};

// Every field carries .catch so junk URL params degrade to their defaults.
export const tournamentListFilterSchema = z
  .object({
    verified: z.union([z.boolean(), booleanStringSchema]).catch(false),
    ruleset: numericEnumValueSchema(Ruleset).optional().catch(undefined),
    searchQuery: z.string().catch(''),
    dateMin: z.coerce.date().optional().catch(undefined),
    dateMax: z.coerce.date().optional().catch(undefined),
    verificationStatus: z
      .preprocess(
        (val) => {
          if (Array.isArray(val)) return val.map(Number);
          if (val !== undefined && val !== null && val !== '')
            return [Number(val)];
          return undefined;
        },
        z.array(numericEnumValueSchema(VerificationStatus)).optional()
      )
      .catch(undefined),
    rejectionReason: bitwiseEnumValueSchema(TournamentRejectionReason)
      .optional()
      .catch(undefined),
    submittedBy: z.coerce.number().int().optional().catch(undefined),
    verifiedBy: z.coerce.number().int().optional().catch(undefined),
    lobbySize: z
      .preprocess(
        (val) => {
          if (Array.isArray(val)) return val.map(Number);
          if (val !== undefined && val !== null && val !== '')
            return [Number(val)];
          return undefined;
        },
        z.array(z.coerce.number().int().min(1).max(8)).optional()
      )
      .catch(undefined),
    minRankRange: z.coerce.number().int().min(1).optional().catch(undefined),
    maxRankRange: z.coerce.number().int().min(1).optional().catch(undefined),
    sort: numericEnumValueSchema(TournamentQuerySortType).catch(
      TournamentQuerySortType.EndTime
    ),
    descending: z.union([z.boolean(), booleanStringSchema]).catch(true),
  })
  .transform((filter) => ({
    ...filter,
    ...toRankRangeFilter({
      min: filter.minRankRange,
      max: filter.maxRankRange,
    }),
  }));

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
  scoreOverride: z.coerce.number().nonnegative().int().nullable(),
  placement: z.coerce.number().nonnegative().int(),
  maxCombo: z.coerce.number().nonnegative().int(),
  statGreat: z.coerce.number().nonnegative().int().nullable(),
  statOk: z.coerce.number().nonnegative().int().nullable(),
  statMeh: z.coerce.number().nonnegative().int().nullable(),
  statMiss: z.coerce.number().nonnegative().int().nullable(),
  statGood: z.coerce.number().nonnegative().int().nullable(),
  statPerfect: z.coerce.number().nonnegative().int().nullable(),
  accuracy: z.coerce.number().nonnegative().max(1.0),
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

// Every field carries .catch so junk URL params degrade to their defaults.
export const leaderboardFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  // Mirrors LeaderboardRequestSchema.country's bounds.
  country: z.string().trim().min(2).max(4).optional().catch(undefined),
  ruleset: numericEnumValueSchema(Ruleset).optional().catch(undefined),
  minOsuRank: z.coerce.number().int().min(1).optional().catch(undefined),
  maxOsuRank: z.coerce.number().int().min(1).optional().catch(undefined),
  minRating: z.coerce
    .number()
    .int()
    .min(100)
    .max(3500)
    .optional()
    .catch(undefined),
  maxRating: z.coerce
    .number()
    .int()
    .min(100)
    .max(3500)
    .optional()
    .catch(undefined),
  minMatches: z.coerce.number().int().min(1).optional().catch(undefined),
  maxMatches: z.coerce.number().int().min(1).optional().catch(undefined),
  minWinRate: z.coerce.number().min(0).max(100).optional().catch(undefined),
  maxWinRate: z.coerce.number().min(0).max(100).optional().catch(undefined),
  tiers: z
    .preprocess(
      (val) => {
        if (typeof val === 'string') {
          return [val as string];
        }

        return val;
      },
      z.array(z.enum(leaderboardTierFilterValues)).optional()
    )
    .catch(undefined),
  friend: z
    .union([z.boolean(), booleanStringSchema])
    .optional()
    .catch(undefined),
  userId: z.coerce.number().min(1).optional().catch(undefined),
});

export const beatmapListSortValues = [
  'sr',
  'bpm',
  'cs',
  'ar',
  'od',
  'hp',
  'length',
  'tournamentCount',
  'gameCount',
  'creator',
] as const;

export const defaultBeatmapListFilter = {
  sort: 'gameCount' as const,
  descending: true,
};

// Every field carries .catch so junk URL params degrade to their defaults.
export const beatmapListFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  // Mirrors BeatmapListRequestSchema.searchQuery's max.
  q: z.string().max(200).catch(''),
  ruleset: z.coerce.number().int().min(0).max(5).optional().catch(undefined),
  minSr: z.coerce.number().min(0).max(15).optional().catch(undefined),
  maxSr: z.coerce.number().min(0).max(15).optional().catch(undefined),
  minBpm: z.coerce.number().min(0).optional().catch(undefined),
  maxBpm: z.coerce.number().min(0).optional().catch(undefined),
  minCs: z.coerce.number().min(0).max(10).optional().catch(undefined),
  maxCs: z.coerce.number().min(0).max(10).optional().catch(undefined),
  minAr: z.coerce.number().min(0).max(10).optional().catch(undefined),
  maxAr: z.coerce.number().min(0).max(10).optional().catch(undefined),
  minOd: z.coerce.number().min(0).max(10).optional().catch(undefined),
  maxOd: z.coerce.number().min(0).max(10).optional().catch(undefined),
  minHp: z.coerce.number().min(0).max(10).optional().catch(undefined),
  maxHp: z.coerce.number().min(0).max(10).optional().catch(undefined),
  minLength: z.coerce.number().int().min(0).optional().catch(undefined),
  maxLength: z.coerce.number().int().min(0).optional().catch(undefined),
  minGameCount: z.coerce.number().int().min(0).optional().catch(undefined),
  maxGameCount: z.coerce.number().int().min(0).optional().catch(undefined),
  minTournamentCount: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .catch(undefined),
  maxTournamentCount: z.coerce
    .number()
    .int()
    .min(0)
    .optional()
    .catch(undefined),
  sort: z.enum(beatmapListSortValues).catch('gameCount'),
  descending: z.union([z.boolean(), booleanStringSchema]).catch(true),
});

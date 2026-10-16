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
  TournamentRejectionReason,
  VerificationStatus,
} from '@otr/core/osu';
import { z } from 'zod';
import {
  FORUM_POST_URL_PREFIX_MESSAGE,
  FORUM_POST_URL_REQUIRED_MESSAGE,
  LOBBY_SIZE_MAXIMUM_MESSAGE,
  LOBBY_SIZE_MINIMUM_MESSAGE,
  RANK_RESTRICTION_MINIMUM_MESSAGE,
  TOURNAMENT_ABBREVIATION_REQUIRED_MESSAGE,
  TOURNAMENT_NAME_REQUIRED_MESSAGE,
} from '@/lib/orpc/schema/tournamentMessages';

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

export const tournamentEditFormSchema = z.object({
  name: z.string().min(1, TOURNAMENT_NAME_REQUIRED_MESSAGE),
  abbreviation: z.string().min(1, TOURNAMENT_ABBREVIATION_REQUIRED_MESSAGE),
  // Each failure stops the checks after it, so the field shows one message
  forumUrl: z
    .string()
    .min(1, { error: FORUM_POST_URL_REQUIRED_MESSAGE, abort: true })
    .url({ error: FORUM_POST_URL_PREFIX_MESSAGE, abort: true })
    .refine(
      (value) =>
        value.startsWith('https://osu.ppy.sh/community/forums/topics/') ||
        value.startsWith('https://osu.ppy.sh/wiki/en/Tournaments/'),
      {
        message: FORUM_POST_URL_PREFIX_MESSAGE,
      }
    ),
  rankRangeLowerBound: z.coerce
    .number()
    .min(1, RANK_RESTRICTION_MINIMUM_MESSAGE),
  lobbySize: z.coerce
    .number()
    .min(1, LOBBY_SIZE_MINIMUM_MESSAGE)
    .max(8, LOBBY_SIZE_MAXIMUM_MESSAGE),
  ruleset: numericEnumValueSchema(Ruleset),
  verificationStatus: numericEnumValueSchema(VerificationStatus),
  rejectionReason: bitwiseEnumValueSchema(TournamentRejectionReason),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
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

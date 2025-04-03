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
import { leaderboardTierFilterValues } from './utils/leaderboard';

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

export const tournamentSubmissionSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  forumUrl: z.string().min(1).regex(
    /^(https:\/\/osu\.ppy\.sh\/community\/forums\/topics\/\d+(\?=\d+)?|https:\/\/osu\.ppy\.sh\/wiki\/en\/Tournaments\/.+)$/,
    'URL must be from osu.ppy.sh forums or the osu! wiki\'s tournaments section'
  ),
  ruleset: numericEnumValueSchema(Ruleset),
  minRank: z.number().min(1).int(),
  lobbySize: z.number().min(1).max(8).int(),
  matchLinks: z.array(
    z.union([
      z.number().int().positive(),
      z.string().regex(
        /^https:\/\/osu\.ppy\.sh\/(mp|community\/matches)\/\d+$/,
        { message: 'Match link must be a valid osu! multiplayer link or match ID' }
      )
    ])
  ),
  beatmapLinks: z.array(
    z.union([
      z.number().int().positive(),
      z.string().regex(
        /^https:\/\/osu\.ppy\.sh\/(b\/\d+|beatmapsets\/\d+#(osu|mania|fruits|taiko)\/\d+)$/,
        { 
          message: 'Must be a valid beatmap URL (either /b/<id> or /beatmapsets/<setid>#<ruleset>/<bid>)'
        }
      )
    ])
  )
})

export const leaderboardFilterSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
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
});

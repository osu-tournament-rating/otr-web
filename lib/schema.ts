import {
  MatchProcessingStatus,
  MatchRejectionReason,
  MatchWarningFlags,
  Ruleset,
  TournamentProcessingStatus,
  TournamentRejectionReason,
  TournamentSubmissionDTO,
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

/** Schema that will convert string input of 'true' or 'false' to a boolean */
const booleanStringSchema = z
  .string()
  .toLowerCase()
  .refine((val) => val === 'true' || val === 'false')
  .transform((val) => val === 'true');

/** Helper function to create an error map while exposing the original value for use */
const makeErrorMap = (messages: {
  [Code in z.ZodIssueCode]?: (value: unknown) => string;
}): z.ZodErrorMap => {
  return (issue, ctx) => {
    return { message: messages[issue.code]?.(ctx.data) || ctx.defaultError };
  };
};

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
  rejectionReason: bitwiseEnumValueSchema(TournamentRejectionReason).optional(),
  processingStatus: numericEnumValueSchema(
    TournamentProcessingStatus
  ).optional(),
});

export const matchEditFormSchema = z.object({
  name: z.string().min(1),
  osuId: z.number().min(1),
  ruleset: numericEnumValueSchema(Ruleset),
  startTime: z.date(),
  endTime: z.date().optional(),
  verificationStatus: numericEnumValueSchema(VerificationStatus),
  rejectionReason: bitwiseEnumValueSchema(MatchRejectionReason).optional(),
  warningFlags: bitwiseEnumValueSchema(MatchWarningFlags).optional(),
  processingStatus: numericEnumValueSchema(MatchProcessingStatus).optional(),
});

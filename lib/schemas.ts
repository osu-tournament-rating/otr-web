import {
  Ruleset,
  TournamentProcessingStatus,
  TournamentQuerySortType,
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

export const TournamentSubmissionFormSchema = z.object({
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
  rankRangeLowerBound: z.number({ coerce: true }).min(1),
  lobbySize: z.number({ coerce: true }).min(1).max(8),
  ruleset: z.nativeEnum(Ruleset),
  rejectionReason: z.nativeEnum(TournamentRejectionReason).optional(),
  // rejectionReason: nativeBitwiseEnum(TournamentRejectionReason).optional(),
  ids: z
    .array(
      z
        .number({
          errorMap: makeErrorMap({
            invalid_type: (value) =>
              `Could not determine osu! match id for entry: "${value}"`,
          }),
        })
        .positive()
    )
    .nonempty('At least one valid osu! match link or id is required'),
  beatmapIds: z.array(
    z
      .number({
        errorMap: makeErrorMap({
          invalid_type: (value) =>
            `Could not determine osu! beatmap id for entry: "${value}"`,
        }),
      })
      .positive()
  ),
  /**
   * Using the 'satisfies' keyword, we can ensure that the defined schema implements every field
   * from the target type, which in this case is {@link TournamentSubmissionDTO}. By doing this we
   * will ensure that type errors are raised if this DTO happens to change in the future
   */
}) satisfies z.ZodSchema<TournamentSubmissionDTO>;

export const TournamentsListFilterSchema = z.object({
  verified: z.union([z.boolean(), booleanStringSchema]).catch(false),
  ruleset: numericEnumValueSchema(Ruleset).optional(),
  searchQuery: z.string().optional(),
  dateMin: z.date().optional(),
  dateMax: z.date().optional(),
  verificationStatus: numericEnumValueSchema(VerificationStatus).optional(),
  rejectionReason: bitwiseEnumValueSchema(TournamentRejectionReason).optional(),
  processingStatus: numericEnumValueSchema(
    TournamentProcessingStatus
  ).optional(),
  submittedBy: z.coerce.number().optional(),
  verifiedBy: z.coerce.number().optional(),
  lobbySize: z.coerce.number().min(1).max(8).optional(),
  sort: numericEnumValueSchema(TournamentQuerySortType).optional(),
  descending: z.union([z.boolean(), booleanStringSchema]).catch(false),
});

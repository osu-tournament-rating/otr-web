import { Ruleset, TournamentRejectionReason, TournamentSubmissionDTO } from "@osu-tournament-rating/otr-api-client";
import { EnumLike, CustomErrorParams, z } from "zod";

function nativeBitwiseEnum<T extends EnumLike>(enumType: T, params?: CustomErrorParams) {
  const validFlags = Object.values(enumType).filter(v => typeof v === 'number');
  const allFlags = validFlags.reduce((acc, flag) => acc | flag, 0);

  return z.custom<T>((value) => {
    return typeof value === 'number' && (validFlags.includes(value) || (value & ~allFlags) === 0);
  }, params);
}

/** Helper function to create an error map while exposing the original value for use */
const makeErrorMap = (messages: { [Code in z.ZodIssueCode]?: (value: unknown) => string; }): z.ZodErrorMap => {
  return (issue, ctx) => {
    return { message: messages[issue.code]?.(ctx.data) || ctx.defaultError };
  };
};

export const TournamentSubmissionFormSchema = z.object({
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  forumUrl: z.string().url().refine(
    (value) => value.startsWith('https://osu.ppy.sh/community/forums/topics/') || value.startsWith('https://osu.ppy.sh/wiki/en/Tournaments/'),
    { message: 'Forum URL must be from "https://osu.ppy.sh/community/forums/topics/" or "https://osu.ppy.sh/wiki/en/Tournaments/"' }
  ),
  rankRangeLowerBound: z.number({ coerce: true }).min(1),
  lobbySize: z.number({ coerce: true }).min(1).max(8),
  ruleset: z.nativeEnum(Ruleset),
  rejectionReason: z.nativeEnum(TournamentRejectionReason).optional(),
  // rejectionReason: nativeBitwiseEnum(TournamentRejectionReason).optional(),
  ids: z.array(
    z
      .number({
        errorMap: makeErrorMap({
          invalid_type: value => `Could not determine osu! match id for entry: "${value}"`
        })
      })
      .positive()
    )
    .nonempty('At least one valid osu! match link or id is required'),
  beatmapIds: z.array(
    z
      .number({
        errorMap: makeErrorMap({
          invalid_type: value => `Could not determine osu! beatmap id for entry: "${value}"`
        })
      })
      .positive()
    )
/**
 * Using the 'satisfies' keyword, we can ensure that the defined schema implements every field
 * from the target type, which in this case is {@link TournamentSubmissionDTO}. By doing this we
 * will ensure that type errors are raised if this DTO happens to change in the future
 */
}) satisfies z.ZodSchema<TournamentSubmissionDTO>;
import { z } from 'zod/v4';

import { TournamentRejectionReason } from '@otr/core/osu';
import { RulesetSchema } from './constants';

const getEnumNumericValues = (enumObject: Record<string, unknown>): number[] =>
  Object.values(enumObject).filter(
    (value): value is number => typeof value === 'number'
  );

const createBitwiseEnumSchema = (enumObject: Record<string, unknown>) => {
  const flags = getEnumNumericValues(enumObject);
  const allFlags = flags.reduce((acc, flag) => acc | flag, 0);

  return z
    .number()
    .int()
    .nonnegative()
    .refine((value) => (value & ~allFlags) === 0, {
      message: 'Invalid flag combination',
    });
};

const hasUniqueValues = (values: readonly number[]) =>
  new Set(values).size === values.length;

const FORUM_URL_PATTERN =
  /^(https:\/\/osu\.ppy\.sh\/(community\/forums\/topics\/\d+|wiki\/en\/Tournaments\/[^?#]*))(\?.*)?$/;

const forumUrlSchema = z
  .string()
  .trim()
  .min(1, 'Forum URL is required')
  .regex(
    FORUM_URL_PATTERN,
    "URL must be from osu.ppy.sh forums or the osu! wiki's tournaments section"
  )
  .transform((value) => value.split('?')[0]);

const matchIdSchema = z.number().int().positive();
const beatmapIdSchema = z.number().int().positive().max(20_000_000);

const baseSubmissionSchema = z.object({
  name: z.string().min(1, 'Tournament name is required'),
  abbreviation: z.string().min(1, 'Tournament abbreviation is required'),
  forumUrl: forumUrlSchema,
  ruleset: RulesetSchema,
  rankRangeLowerBound: z
    .number()
    .int()
    .min(1, 'Rank restriction must be at least 1'),
  lobbySize: z
    .number()
    .int()
    .min(1, 'Lobby size must be at least 1')
    .max(8, 'Lobby size cannot exceed 8'),
  rejectionReason: createBitwiseEnumSchema(TournamentRejectionReason).default(
    TournamentRejectionReason.None
  ),
  ids: z.array(matchIdSchema).min(1, 'At least one match ID is required'),
  beatmapIds: z.array(beatmapIdSchema).default([]),
});

export const TournamentSubmissionInputSchema = baseSubmissionSchema.check(
  (ctx) => {
    const {
      value: { ids, beatmapIds },
      issues,
    } = ctx;

    if (!hasUniqueValues(ids)) {
      issues.push({
        path: ['ids'],
        code: 'custom',
        message: 'Duplicate match IDs are not allowed',
        input: ids,
      });
    }

    if (!hasUniqueValues(beatmapIds)) {
      issues.push({
        path: ['beatmapIds'],
        code: 'custom',
        message: 'Duplicate beatmap IDs are not allowed',
        input: beatmapIds,
      });
    }
  }
);

export type TournamentSubmissionInput = z.infer<
  typeof TournamentSubmissionInputSchema
>;

const parseMatchIds = z.preprocess(
  (val) => {
    if (
      !val ||
      (Array.isArray(val) && val.length === 0) ||
      (typeof val === 'string' && val.trim() === '')
    ) {
      return [];
    }

    if (Array.isArray(val)) {
      return val.map((item) => {
        if (!item || (typeof item === 'string' && item.trim() === '')) {
          return 0;
        }

        const str = String(item).trim();
        const match = str.match(
          /^(?:(\d+)|https:\/\/osu\.ppy\.sh\/(?:community\/matches|mp)\/(\d+))$/
        );
        return match ? Number(match[1] || match[2]) : 0;
      });
    }

    return [];
  },
  z
    .array(matchIdSchema)
    .min(1, 'At least one valid match link is required')
    .refine(
      (val) => val.every((id) => id > 0),
      'All match links must be valid osu! match IDs or URLs'
    )
);

const parseBeatmapIds = z.preprocess(
  (val) => {
    if (
      !val ||
      (Array.isArray(val) && val.length === 0) ||
      (typeof val === 'string' && val.trim() === '')
    ) {
      return [];
    }

    if (Array.isArray(val)) {
      return val.map((item) => {
        if (!item || (typeof item === 'string' && item.trim() === '')) {
          return 0;
        }

        const str = String(item).trim();
        const match = str.match(
          /^(?:(\d+)|https:\/\/osu\.ppy\.sh\/b\/(\d+)|https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#(?:osu|fruits|mania|taiko)\/(\d+))$/
        );
        const numericId = match ? Number(match[1] || match[2] || match[3]) : 0;
        return numericId > 20_000_000 ? 0 : numericId;
      });
    }

    return [];
  },
  z
    .array(beatmapIdSchema)
    .refine(
      (val) => val.every((id) => id > 0),
      'All beatmap links must be valid osu! beatmap IDs or URLs'
    )
);

export const tournamentSubmissionFormSchema = baseSubmissionSchema
  .extend({
    ids: parseMatchIds,
    beatmapIds: parseBeatmapIds,
  })
  .check((ctx) => {
    const ids = ctx.value.ids as number[];
    const beatmapIds = ctx.value.beatmapIds as number[];

    if (!hasUniqueValues(ids)) {
      ctx.issues.push({
        path: ['ids'],
        code: 'custom',
        message: 'Duplicate match IDs are not allowed',
        input: ids,
      });
    }

    if (!hasUniqueValues(beatmapIds)) {
      ctx.issues.push({
        path: ['beatmapIds'],
        code: 'custom',
        message: 'Duplicate beatmap IDs are not allowed',
        input: beatmapIds,
      });
    }
  });

export type TournamentSubmissionFormValues = z.infer<
  typeof tournamentSubmissionFormSchema
>;

export const TournamentSubmissionResponseSchema = z.object({
  id: z.number().int().positive(),
  warnings: z.array(z.string().min(1)).optional(),
});

export type TournamentSubmissionResponse = z.infer<
  typeof TournamentSubmissionResponseSchema
>;

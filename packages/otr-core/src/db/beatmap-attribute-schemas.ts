import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { beatmapAttributes, beatmapFiles } from './schema';
import { DataFetchStatus } from './data-fetch-status';
import {
  BeatmapChecksumSchema,
  BeatmapDifficultyPayloadSchema,
  BeatmapHitWindowsSchema,
  BeatmapStorageProviderSchema,
  CalculationSettingsSchema,
} from '../osu/beatmap-attributes';

/** Shared stored shapes; consumers choose their own public projection. */
export const BeatmapFileSchema = createSelectSchema(beatmapFiles, {
  provider: BeatmapStorageProviderSchema,
  fetchStatus: z.enum(DataFetchStatus),
  checksum: BeatmapChecksumSchema.nullable(),
  storageKey: z
    .string()
    .regex(/^sha256\/[a-f0-9]{2}\/[a-f0-9]{64}\.osu$/)
    .nullable(),
  byteLength: z.number().int().positive().nullable(),
  errorCode: z
    .string()
    .regex(/^[a-z][a-z0-9_]{0,63}$/)
    .nullable(),
}).superRefine((file, ctx) => {
  if (
    file.fetchStatus === DataFetchStatus.Fetched &&
    [file.checksum, file.storageKey, file.byteLength, file.acquiredAt].some(
      (value) => value === null
    )
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Fetched files require complete provenance',
    });
  }
  const parsed =
    file.sourceMode === null
      ? file.keyCount === null
      : file.sourceMode === 3
        ? file.keyCount !== null && file.keyCount > 0
        : [0, 1, 2].includes(file.sourceMode) && file.keyCount === null;
  if (!parsed)
    ctx.addIssue({
      code: 'custom',
      message: 'Native file mode and key count must agree',
    });
});

export const BeatmapAttributeResultSchema = createSelectSchema(
  beatmapAttributes,
  {
    checksum: BeatmapChecksumSchema,
    settings: CalculationSettingsSchema,
    difficulty: BeatmapDifficultyPayloadSchema,
    hitWindows: BeatmapHitWindowsSchema,
  }
);

export type BeatmapFile = z.infer<typeof BeatmapFileSchema>;
export type BeatmapAttributeResult = z.infer<
  typeof BeatmapAttributeResultSchema
>;

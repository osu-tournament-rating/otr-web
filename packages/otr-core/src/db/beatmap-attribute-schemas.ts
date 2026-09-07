import { createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { beatmapAttributes, beatmapFiles } from './schema';
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
  checksum: BeatmapChecksumSchema,
  storageKey: z.string().regex(/^sha256\/[a-f0-9]{2}\/[a-f0-9]{64}\.osu$/),
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

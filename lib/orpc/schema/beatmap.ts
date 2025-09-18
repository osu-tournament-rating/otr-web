import { z } from 'zod/v4';

import {
  beatmapAttributeSelectSchema,
  beatmapSelectSchema,
  beatmapsetSelectSchema,
} from './base';
import { CreatedUpdatedOmit } from './constants';
import { PlayerSchema } from './player';

const beatmapsetBaseSchema = beatmapsetSelectSchema
  .omit(CreatedUpdatedOmit)
  .extend({
    creator: PlayerSchema.nullable(),
  });

export const BeatmapsetCompactSchema = beatmapsetBaseSchema;

export const BeatmapAttributeSchema = beatmapAttributeSelectSchema.pick({
  id: true,
  mods: true,
  sr: true,
  created: true,
});

export const BeatmapSchema = beatmapSelectSchema
  .omit(CreatedUpdatedOmit)
  .extend({
    beatmapset: BeatmapsetCompactSchema.nullable().optional(),
  });

export type BeatmapsetCompact = z.infer<typeof BeatmapsetCompactSchema>;
export type BeatmapAttribute = z.infer<typeof BeatmapAttributeSchema>;
export type Beatmap = z.infer<typeof BeatmapSchema>;

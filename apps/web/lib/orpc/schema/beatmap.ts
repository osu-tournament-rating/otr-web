import { z } from 'zod';

import {
  beatmapAttributeSelectSchema,
  beatmapSelectSchema,
  beatmapsetSelectSchema,
} from './base';
import { CreatedUpdatedOmit, RulesetSchema } from './constants';
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
    ruleset: RulesetSchema,
    beatmapset: BeatmapsetCompactSchema.nullable().optional(),
  });

export type BeatmapsetCompact = z.infer<typeof BeatmapsetCompactSchema>;
export type BeatmapAttribute = z.infer<typeof BeatmapAttributeSchema>;
export type Beatmap = z.infer<typeof BeatmapSchema>;

/** Editable fields for a beatmap the osu! API no longer serves. */
export const BeatmapAdminUpdateInputSchema = z.object({
  id: z.number().int().positive(),
  diffName: z.string().trim().min(1).max(512),
  ruleset: RulesetSchema,
  rankedStatus: z.number().int().min(-2).max(4),
  totalLength: z.number().int().min(0).max(86_400),
  drainLength: z.number().int().min(0).max(86_400),
  bpm: z.number().min(0).max(10_000),
  countCircle: z.number().int().min(0),
  countSlider: z.number().int().min(0),
  countSpinner: z.number().int().min(0),
  cs: z.number().min(0).max(20),
  hp: z.number().min(0).max(20),
  od: z.number().min(0).max(20),
  ar: z.number().min(0).max(20),
  sr: z.number().min(0).max(100),
  maxCombo: z.number().int().min(0).nullable(),
  titleOverride: z.string().trim().max(512).nullable(),
  artistOverride: z.string().trim().max(512).nullable(),
  /** osu! user ids; a missing player is created and queued for a fetch. */
  setOwnerOsuIdOverride: z.number().int().positive().nullable(),
  creatorOsuIds: z.array(z.number().int().positive()).max(16),
});

export const BeatmapAdminUpdateResponseSchema = z.object({
  success: z.boolean(),
});

export type BeatmapAdminUpdateInput = z.infer<
  typeof BeatmapAdminUpdateInputSchema
>;

const AdminNoteContentSchema = z.string().trim().min(1);

export const BeatmapAdminNoteCreateInputSchema = z.object({
  beatmapId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const BeatmapAdminNoteUpdateInputSchema = z.object({
  noteId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const BeatmapAdminNoteDeleteInputSchema = z.object({
  noteId: z.number().int().positive(),
});

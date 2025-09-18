import { z } from 'zod';

import { PlayerSchema } from './player';

const BeatmapsetBaseSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  artist: z.string(),
  title: z.string(),
  rankedStatus: z.number().int(),
  rankedDate: z.string().nullable(),
  submittedDate: z.string().nullable(),
  creatorId: z.number().int().nullable(),
  creator: PlayerSchema.nullable(),
});

export const BeatmapsetCompactSchema = BeatmapsetBaseSchema;

export const BeatmapAttributeSchema = z.object({
  id: z.number().int(),
  mods: z.number().int(),
  sr: z.number(),
  created: z.string().nullable().optional(),
});

export const BeatmapSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  ruleset: z.number().int(),
  rankedStatus: z.number().int(),
  diffName: z.string(),
  totalLength: z.number().int(),
  drainLength: z.number().int(),
  bpm: z.number(),
  countCircle: z.number().int(),
  countSlider: z.number().int(),
  countSpinner: z.number().int(),
  cs: z.number(),
  hp: z.number(),
  od: z.number(),
  ar: z.number(),
  sr: z.number(),
  maxCombo: z.number().int().nullable(),
  beatmapsetId: z.number().int().nullable(),
  dataFetchStatus: z.number().int(),
  beatmapset: BeatmapsetCompactSchema.nullable().optional(),
});

export type BeatmapsetCompact = z.infer<typeof BeatmapsetCompactSchema>;
export type BeatmapAttribute = z.infer<typeof BeatmapAttributeSchema>;
export type Beatmap = z.infer<typeof BeatmapSchema>;

import { z } from 'zod/v4';
import { RulesetSchema } from './constants';

export const PlayerBeatmapsRequestSchema = z.object({
  key: z.string().min(1),
  ruleset: RulesetSchema.optional(),
});

export const PlayerBeatmapStatsSchema = z.object({
  id: z.number().int().nonnegative(),
  osuId: z.number().int().nonnegative().default(0),
  diffName: z.string().default(''),
  totalLength: z.number().nonnegative().default(0),
  drainLength: z.number().nonnegative().default(0),
  bpm: z.number().nonnegative().default(0),
  countCircle: z.number().int().nonnegative().default(0),
  countSlider: z.number().int().nonnegative().default(0),
  countSpinner: z.number().int().nonnegative().default(0),
  cs: z.number(),
  hp: z.number(),
  od: z.number(),
  ar: z.number(),
  sr: z.number().nonnegative(),
  maxCombo: z.number().int().nonnegative().default(0),
  beatmapsetId: z.number().int().nonnegative(),
  ruleset: RulesetSchema,
  artist: z.string().default(''),
  title: z.string().default(''),
  tournamentCount: z.number().int().nonnegative().default(0),
});

export type PlayerBeatmapsRequest = z.infer<typeof PlayerBeatmapsRequestSchema>;
export type PlayerBeatmapStats = z.infer<typeof PlayerBeatmapStatsSchema>;

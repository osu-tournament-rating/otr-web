import { z } from 'zod/v4';
import { Mods } from '@otr/core/osu';
import { RulesetSchema } from './constants';
import { TournamentListItemSchema } from './tournament';

export const BeatmapTournamentListItemSchema = TournamentListItemSchema.extend({
  gamesPlayed: z.number().int().nonnegative().default(0),
  mostCommonMod: z.number().int().nonnegative().default(Mods.None),
});

export const PlayerBeatmapsRequestSchema = z.object({
  key: z.string().min(1),
  ruleset: RulesetSchema.optional(),
});

export const PlayerBeatmapStatsSchema = z.object({
  id: z.number().int().nonnegative(),
  osuId: z.number().int().nonnegative().default(0),
  rankedStatus: z.number().default(-2),
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
  gameCount: z.number().int().nonnegative().default(0),
  tournaments: z.array(BeatmapTournamentListItemSchema).optional().default([]),
});

export type PlayerBeatmapsRequest = z.infer<typeof PlayerBeatmapsRequestSchema>;
export type PlayerBeatmapStats = z.infer<typeof PlayerBeatmapStatsSchema>;
export type BeatmapTournamentListItem = z.infer<
  typeof BeatmapTournamentListItemSchema
>;

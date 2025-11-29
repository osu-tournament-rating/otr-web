import { z } from 'zod/v4';

import { RulesetSchema } from './constants';

export const BeatmapListSortSchema = z.enum([
  'sr',
  'bpm',
  'cs',
  'ar',
  'od',
  'hp',
  'length',
  'tournamentCount',
  'gameCount',
  'creator',
]);

export const BeatmapListRequestSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  searchQuery: z.string().trim().min(1).optional(),
  minSr: z.number().min(0).max(15).optional(),
  maxSr: z.number().min(0).max(15).optional(),
  minBpm: z.number().min(0).optional(),
  maxBpm: z.number().min(0).optional(),
  minCs: z.number().min(0).max(10).optional(),
  maxCs: z.number().min(0).max(10).optional(),
  minAr: z.number().min(0).max(11).optional(),
  maxAr: z.number().min(0).max(11).optional(),
  minOd: z.number().min(0).max(11).optional(),
  maxOd: z.number().min(0).max(11).optional(),
  minHp: z.number().min(0).max(10).optional(),
  maxHp: z.number().min(0).max(10).optional(),
  minLength: z.number().int().min(0).optional(),
  maxLength: z.number().int().min(0).optional(),
  minGameCount: z.number().int().min(0).optional(),
  maxGameCount: z.number().int().min(0).optional(),
  minTournamentCount: z.number().int().min(0).optional(),
  maxTournamentCount: z.number().int().min(0).optional(),
  sort: BeatmapListSortSchema.default('gameCount'),
  descending: z.boolean().default(true),
});

export const BeatmapListItemSchema = z.object({
  id: z.number().int(),
  osuId: z.number(),
  artist: z.string(),
  title: z.string(),
  diffName: z.string(),
  ruleset: RulesetSchema,
  sr: z.number(),
  bpm: z.number(),
  cs: z.number(),
  ar: z.number(),
  od: z.number(),
  hp: z.number(),
  totalLength: z.number(),
  beatmapsetOsuId: z.number().nullable(),
  creator: z.string().nullable(),
  verifiedTournamentCount: z.number().int().nonnegative(),
  verifiedGameCount: z.number().int().nonnegative(),
});

export const BeatmapListResponseSchema = z.object({
  items: z.array(BeatmapListItemSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalPages: z.number().int().min(0),
});

export type BeatmapListSort = z.infer<typeof BeatmapListSortSchema>;
export type BeatmapListRequest = z.infer<typeof BeatmapListRequestSchema>;
export type BeatmapListItem = z.infer<typeof BeatmapListItemSchema>;
export type BeatmapListResponse = z.infer<typeof BeatmapListResponseSchema>;

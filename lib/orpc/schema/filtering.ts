import { Ruleset } from '@/lib/osu/enums';
import { z } from 'zod/v4';

const FilteringCriteriaSchema = z.object({
  ruleset: z.nativeEnum(Ruleset),
  minRating: z.number().int().optional().nullable(),
  maxRating: z.number().int().optional().nullable(),
  peakRating: z.number().int().optional().nullable(),
  tournamentsPlayed: z.number().int().optional().nullable(),
  maxTournamentsPlayed: z.number().int().optional().nullable(),
  matchesPlayed: z.number().int().optional().nullable(),
  maxMatchesPlayed: z.number().int().optional().nullable(),
});

export const FilteringRequestSchema = FilteringCriteriaSchema.extend({
  osuPlayerIds: z.array(z.number().int().positive()).min(1).max(500),
});

export type FilteringRequest = z.infer<typeof FilteringRequestSchema>;

export const PlayerFilteringResultSchema = z.object({
  playerId: z.number().int().nullable(),
  osuId: z.number().int().nullable(),
  username: z.string().nullable(),
  isSuccess: z.boolean(),
  failureReason: z.number().int().nullable(),
  currentRating: z.number().nullable(),
  peakRating: z.number().nullable(),
  tournamentsPlayed: z.number().int().nullable(),
  matchesPlayed: z.number().int().nullable(),
});

export type PlayerFilteringResult = z.infer<typeof PlayerFilteringResultSchema>;

export const FilteringResultSchema = z.object({
  filterReportId: z.number().int().nonnegative(),
  playersPassed: z.number().int().nonnegative(),
  playersFailed: z.number().int().nonnegative(),
  filteringResults: z.array(PlayerFilteringResultSchema),
});

export type FilteringResult = z.infer<typeof FilteringResultSchema>;

export const StoredFilteringRequestSchema = FilteringCriteriaSchema.extend({
  osuPlayerIds: z.array(z.number().int().positive()),
});

export type StoredFilteringRequest = z.infer<
  typeof StoredFilteringRequestSchema
>;

export const FilterReportSchema = z.object({
  id: z.number().int().positive(),
  created: z.string(),
  request: StoredFilteringRequestSchema,
  response: FilteringResultSchema,
});

export type FilterReport = z.infer<typeof FilterReportSchema>;

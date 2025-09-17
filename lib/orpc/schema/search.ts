import { z } from 'zod';

import { TierProgressSchema } from '@/lib/orpc/schema/leaderboard';

export const SearchRequestSchema = z.object({
  searchKey: z.string().trim().min(1).max(100),
});

export const PlayerSearchResultSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  username: z.string(),
  rating: z.number().nullable(),
  ruleset: z.number().int().nullable(),
  globalRank: z.number().int().nullable(),
  tierProgress: TierProgressSchema.nullable(),
});

export const TournamentSearchResultSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  ruleset: z.number().int(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
  lobbySize: z.number().int(),
  abbreviation: z.string().nullable(),
});

export const MatchSearchResultSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int().nullable(),
  name: z.string(),
  tournamentName: z.string(),
});

export const SearchResponseSchema = z.object({
  players: PlayerSearchResultSchema.array(),
  tournaments: TournamentSearchResultSchema.array(),
  matches: MatchSearchResultSchema.array(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
export type PlayerSearchResult = z.infer<typeof PlayerSearchResultSchema>;
export type TournamentSearchResult = z.infer<
  typeof TournamentSearchResultSchema
>;
export type MatchSearchResult = z.infer<typeof MatchSearchResultSchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

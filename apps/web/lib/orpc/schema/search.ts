import { z } from 'zod/v4';

import {
  matchSelectSchema,
  playerRatingSelectSchema,
  playerSelectSchema,
  tournamentSelectSchema,
} from './base';
import { RulesetSchema, VerificationStatusSchema } from './constants';
import { TierProgressSchema } from './leaderboard';

export const SearchRequestSchema = z.object({
  searchKey: z.string().trim().min(1).max(100),
});

export const PlayerSearchResultSchema = playerSelectSchema
  .pick({
    id: true,
    osuId: true,
    username: true,
  })
  .extend({
    rating: playerRatingSelectSchema.shape.rating.nullable(),
    ruleset: RulesetSchema.nullable(),
    globalRank: playerRatingSelectSchema.shape.globalRank.nullable(),
    tierProgress: TierProgressSchema.nullable(),
  });

const tournamentSearchBaseSchema = tournamentSelectSchema.pick({
  id: true,
  name: true,
  ruleset: true,
  verificationStatus: true,
  rejectionReason: true,
  lobbySize: true,
  abbreviation: true,
  isLazer: true,
});

export const TournamentSearchResultSchema = tournamentSearchBaseSchema
  .omit({
    abbreviation: true,
  })
  .extend({
    ruleset: RulesetSchema,
    verificationStatus: VerificationStatusSchema,
    abbreviation: tournamentSearchBaseSchema.shape.abbreviation.nullable(),
  });

const matchSearchBaseSchema = matchSelectSchema.pick({
  id: true,
  osuId: true,
  name: true,
});

export const MatchSearchResultSchema = matchSearchBaseSchema
  .omit({
    osuId: true,
  })
  .extend({
    osuId: matchSearchBaseSchema.shape.osuId.nullable(),
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

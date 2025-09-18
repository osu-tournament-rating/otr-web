import { z } from 'zod/v4';

import {
  gameScoreSelectSchema,
  gameSelectSchema,
  matchRosterSelectSchema,
  matchSelectSchema,
  playerMatchStatsSelectSchema,
  ratingAdjustmentSelectSchema,
  tournamentSelectSchema,
} from './base';
import { BeatmapSchema } from './beatmap';
import { CreatedUpdatedOmit } from './constants';
import { AdminNoteSchema } from './common';
import { PlayerSchema } from './player';

const matchTournamentBaseSchema = tournamentSelectSchema.pick({
  id: true,
  name: true,
  abbreviation: true,
});

export const MatchTournamentSchema = matchTournamentBaseSchema
  .omit({
    abbreviation: true,
  })
  .extend({
    abbreviation: matchTournamentBaseSchema.shape.abbreviation.nullable(),
  })
  .nullable();

export const MatchPlayerSchema = PlayerSchema.pick({
  id: true,
  osuId: true,
  username: true,
  country: true,
  defaultRuleset: true,
}).extend({
  userId: z.number().int().nullable().optional(),
});

export const MatchBeatmapSchema = BeatmapSchema.extend({
  creators: z.array(PlayerSchema).optional(),
}).transform((value) => ({
  ...value,
  creators: value.creators ?? [],
}));

export const MatchRosterSchema = matchRosterSelectSchema.pick({
  id: true,
  roster: true,
  team: true,
  score: true,
});

const gameScoreBaseSchema = gameScoreSelectSchema.extend({
  accuracy: z.number(),
  adminNotes: z.array(AdminNoteSchema).optional(),
});

export const GameScoreSchema = gameScoreBaseSchema.transform((value) => ({
  ...value,
  adminNotes: value.adminNotes ?? [],
}));

const gameBaseSchema = gameSelectSchema.omit(CreatedUpdatedOmit).extend({
  isFreeMod: z.boolean(),
  beatmap: MatchBeatmapSchema.nullable(),
  adminNotes: z.array(AdminNoteSchema).optional(),
  scores: z.array(GameScoreSchema).optional(),
});

export const GameSchema = gameBaseSchema.transform((value) => ({
  ...value,
  beatmap:
    value.beatmap != null
      ? {
          ...value.beatmap,
          creators: value.beatmap.creators ?? [],
        }
      : null,
  adminNotes: value.adminNotes ?? [],
  scores: value.scores ?? [],
}));

export const PlayerMatchStatsSchema = playerMatchStatsSelectSchema.pick({
  id: true,
  playerId: true,
  matchId: true,
  won: true,
  gamesWon: true,
  gamesLost: true,
  gamesPlayed: true,
  averageScore: true,
  averageAccuracy: true,
  averageMisses: true,
  averagePlacement: true,
  matchCost: true,
  teammateIds: true,
  opponentIds: true,
});

export const RatingAdjustmentSchema = ratingAdjustmentSelectSchema
  .omit({
    created: true,
  })
  .extend({
    ratingDelta: z.number(),
    volatilityDelta: z.number(),
  });

export const MatchWinRecordSchema = z
  .object({
    matchId: z.number().int(),
    isTied: z.boolean(),
    loserRoster: z.array(z.number().int()).nullable(),
    winnerRoster: z.array(z.number().int()).nullable(),
    loserPoints: z.number().int(),
    winnerPoints: z.number().int(),
    loserTeam: z.number().int().nullable(),
    winnerTeam: z.number().int().nullable(),
  })
  .nullable();

const matchBaseSchema = matchSelectSchema.omit(CreatedUpdatedOmit).extend({
  games: z.array(GameSchema).optional(),
  players: z.array(MatchPlayerSchema).optional(),
  playerMatchStats: z.array(PlayerMatchStatsSchema).optional(),
  ratingAdjustments: z.array(RatingAdjustmentSchema).optional(),
  adminNotes: z.array(AdminNoteSchema).optional(),
  tournament: MatchTournamentSchema.optional(),
  winRecord: MatchWinRecordSchema.optional(),
  rosters: z.array(MatchRosterSchema).optional(),
});

export const MatchSchema = matchBaseSchema.transform((value) => ({
  ...value,
  games: value.games ?? [],
  players: value.players ?? [],
  playerMatchStats: value.playerMatchStats ?? [],
  ratingAdjustments: value.ratingAdjustments ?? [],
  adminNotes: value.adminNotes ?? [],
  tournament: value.tournament ?? null,
  winRecord: value.winRecord ?? null,
  rosters: value.rosters ?? [],
}));

export const MatchDetailSchema = MatchSchema;

export const MatchIdInputSchema = z.object({
  id: z.number().int().positive(),
});

export type MatchTournament = z.infer<typeof MatchTournamentSchema>;
export type MatchPlayer = z.infer<typeof MatchPlayerSchema>;
export type MatchBeatmap = z.infer<typeof MatchBeatmapSchema>;
export type MatchRoster = z.infer<typeof MatchRosterSchema>;
export type GameScore = z.infer<typeof GameScoreSchema>;
export type Game = z.infer<typeof GameSchema>;
export type PlayerMatchStats = z.infer<typeof PlayerMatchStatsSchema>;
export type RatingAdjustment = z.infer<typeof RatingAdjustmentSchema>;
export type MatchWinRecord = z.infer<typeof MatchWinRecordSchema>;
export type Match = z.infer<typeof MatchSchema>;
export type MatchDetail = z.infer<typeof MatchDetailSchema>;

import { z } from 'zod';

import { BeatmapSchema, BeatmapsetCompactSchema } from './beatmap';
import { AdminNoteSchema } from './common';
import { PlayerSchema } from './player';

export const MatchTournamentSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    abbreviation: z.string().nullable(),
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
  beatmapset: BeatmapsetCompactSchema.nullable().optional(),
  creators: z.array(PlayerSchema).default([]),
});

export const MatchRosterSchema = z.object({
  id: z.number().int(),
  roster: z.array(z.number().int()),
  team: z.number().int(),
  score: z.number().int(),
});

export const GameScoreSchema = z.object({
  id: z.number().int(),
  playerId: z.number().int(),
  gameId: z.number().int(),
  score: z.number().int(),
  placement: z.number().int(),
  maxCombo: z.number().int(),
  count50: z.number().int(),
  count100: z.number().int(),
  count300: z.number().int(),
  countMiss: z.number().int(),
  countKatu: z.number().int(),
  countGeki: z.number().int(),
  pass: z.boolean(),
  perfect: z.boolean(),
  grade: z.number().int(),
  mods: z.number().int(),
  team: z.number().int(),
  ruleset: z.number().int(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
  accuracy: z.number(),
  adminNotes: AdminNoteSchema.array().default([]),
  created: z.string(),
  updated: z.string().nullable(),
});

export const GameSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  matchId: z.number().int(),
  beatmapId: z.number().int().nullable(),
  ruleset: z.number().int(),
  scoringType: z.number().int(),
  teamType: z.number().int(),
  mods: z.number().int(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
  warningFlags: z.number().int(),
  playMode: z.number().int(),
  isFreeMod: z.boolean(),
  beatmap: MatchBeatmapSchema.nullable(),
  adminNotes: AdminNoteSchema.array().default([]),
  scores: GameScoreSchema.array().default([]),
});

export const PlayerMatchStatsSchema = z.object({
  id: z.number().int(),
  playerId: z.number().int(),
  matchId: z.number().int(),
  won: z.boolean(),
  gamesWon: z.number().int(),
  gamesLost: z.number().int(),
  gamesPlayed: z.number().int(),
  averageScore: z.number(),
  averageAccuracy: z.number(),
  averageMisses: z.number(),
  averagePlacement: z.number(),
  matchCost: z.number(),
  teammateIds: z.array(z.number().int()),
  opponentIds: z.array(z.number().int()),
});

export const RatingAdjustmentSchema = z.object({
  id: z.number().int(),
  adjustmentType: z.number().int(),
  ruleset: z.number().int(),
  timestamp: z.string(),
  ratingBefore: z.number(),
  ratingAfter: z.number(),
  ratingDelta: z.number(),
  volatilityBefore: z.number(),
  volatilityAfter: z.number(),
  volatilityDelta: z.number(),
  playerRatingId: z.number().int(),
  playerId: z.number().int(),
  matchId: z.number().int().nullable(),
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

export const MatchSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  tournamentId: z.number().int(),
  name: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
  warningFlags: z.number().int(),
  submittedByUserId: z.number().int().nullable(),
  verifiedByUserId: z.number().int().nullable(),
  dataFetchStatus: z.number().int(),
  games: GameSchema.array().default([]),
  players: MatchPlayerSchema.array().default([]),
  playerMatchStats: PlayerMatchStatsSchema.array().default([]),
  ratingAdjustments: RatingAdjustmentSchema.array().default([]),
  adminNotes: AdminNoteSchema.array().default([]),
  tournament: MatchTournamentSchema.default(null),
  winRecord: MatchWinRecordSchema.default(null),
  rosters: MatchRosterSchema.array().default([]),
});

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

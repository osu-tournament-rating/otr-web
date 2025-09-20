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
import { CreatedUpdatedOmit, VerificationStatusSchema } from './constants';
import { AdminNoteSchema } from './common';
import { PlayerSchema } from './player';

const AdminNoteContentSchema = z.string().trim().min(1);

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

const PositiveIntSchema = z.number().int().positive();
const BitmaskEnumValueSchema = z.number().int().min(0);
const NonNegativeIntSchema = z.number().int().min(0);

export const MatchAdminUpdateInputSchema = z.object({
  id: PositiveIntSchema,
  name: z.string().min(1),
  verificationStatus: VerificationStatusSchema,
  rejectionReason: BitmaskEnumValueSchema,
  warningFlags: BitmaskEnumValueSchema,
  startTime: z.string().datetime().nullable(),
  endTime: z.string().datetime().nullable(),
});

export const MatchAdminMutationResponseSchema = z.object({
  success: z.boolean(),
});

export const GameAdminUpdateInputSchema = z.object({
  id: PositiveIntSchema,
  ruleset: NonNegativeIntSchema,
  scoringType: NonNegativeIntSchema,
  teamType: NonNegativeIntSchema,
  mods: BitmaskEnumValueSchema,
  verificationStatus: VerificationStatusSchema,
  rejectionReason: BitmaskEnumValueSchema,
  warningFlags: BitmaskEnumValueSchema,
  startTime: z.string().datetime().nullable(),
  endTime: z.string().datetime().nullable(),
});

export const GameAdminMutationResponseSchema = z.object({
  success: z.boolean(),
});

export const GameScoreAdminUpdateInputSchema = z.object({
  id: PositiveIntSchema,
  score: NonNegativeIntSchema,
  placement: NonNegativeIntSchema,
  maxCombo: NonNegativeIntSchema,
  count50: NonNegativeIntSchema,
  count100: NonNegativeIntSchema,
  count300: NonNegativeIntSchema,
  countMiss: NonNegativeIntSchema,
  countKatu: NonNegativeIntSchema,
  countGeki: NonNegativeIntSchema,
  accuracy: z.number().min(0),
  grade: NonNegativeIntSchema,
  mods: BitmaskEnumValueSchema,
  ruleset: NonNegativeIntSchema,
  verificationStatus: VerificationStatusSchema,
  rejectionReason: BitmaskEnumValueSchema,
  team: NonNegativeIntSchema,
});

export const GameScoreAdminMutationResponseSchema = z.object({
  success: z.boolean(),
});

export const MatchAdminDeleteInputSchema = MatchIdInputSchema;

export const MatchAdminDeletePlayerScoresInputSchema = z.object({
  matchId: PositiveIntSchema,
  playerId: PositiveIntSchema,
});

export const MatchAdminDeletePlayerScoresResponseSchema = z.object({
  success: z.boolean(),
  deletedCount: NonNegativeIntSchema,
});

export const GameAdminDeleteInputSchema = z.object({
  id: PositiveIntSchema,
});

export const GameScoreAdminDeleteInputSchema = z.object({
  id: PositiveIntSchema,
});

export const MatchAdminNoteCreateInputSchema = z.object({
  matchId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const MatchAdminNoteUpdateInputSchema = z.object({
  noteId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const MatchAdminNoteDeleteInputSchema = z.object({
  noteId: z.number().int().positive(),
});

export const GameAdminNoteCreateInputSchema = z.object({
  gameId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const GameAdminNoteUpdateInputSchema = z.object({
  noteId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const GameAdminNoteDeleteInputSchema = z.object({
  noteId: z.number().int().positive(),
});

export const GameScoreAdminNoteCreateInputSchema = z.object({
  scoreId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const GameScoreAdminNoteUpdateInputSchema = z.object({
  noteId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const GameScoreAdminNoteDeleteInputSchema = z.object({
  noteId: z.number().int().positive(),
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
export type MatchAdminUpdateInput = z.infer<typeof MatchAdminUpdateInputSchema>;
export type MatchAdminMutationResponse = z.infer<
  typeof MatchAdminMutationResponseSchema
>;
export type MatchAdminDeleteInput = z.infer<typeof MatchAdminDeleteInputSchema>;
export type MatchAdminDeletePlayerScoresInput = z.infer<
  typeof MatchAdminDeletePlayerScoresInputSchema
>;
export type MatchAdminDeletePlayerScoresResponse = z.infer<
  typeof MatchAdminDeletePlayerScoresResponseSchema
>;
export type MatchAdminNoteCreateInput = z.infer<
  typeof MatchAdminNoteCreateInputSchema
>;
export type MatchAdminNoteUpdateInput = z.infer<
  typeof MatchAdminNoteUpdateInputSchema
>;
export type MatchAdminNoteDeleteInput = z.infer<
  typeof MatchAdminNoteDeleteInputSchema
>;
export type GameAdminUpdateInput = z.infer<typeof GameAdminUpdateInputSchema>;
export type GameAdminMutationResponse = z.infer<
  typeof GameAdminMutationResponseSchema
>;
export type GameAdminDeleteInput = z.infer<typeof GameAdminDeleteInputSchema>;
export type GameAdminNoteCreateInput = z.infer<
  typeof GameAdminNoteCreateInputSchema
>;
export type GameAdminNoteUpdateInput = z.infer<
  typeof GameAdminNoteUpdateInputSchema
>;
export type GameAdminNoteDeleteInput = z.infer<
  typeof GameAdminNoteDeleteInputSchema
>;
export type GameScoreAdminUpdateInput = z.infer<
  typeof GameScoreAdminUpdateInputSchema
>;
export type GameScoreAdminMutationResponse = z.infer<
  typeof GameScoreAdminMutationResponseSchema
>;
export type GameScoreAdminDeleteInput = z.infer<
  typeof GameScoreAdminDeleteInputSchema
>;
export type GameScoreAdminNoteCreateInput = z.infer<
  typeof GameScoreAdminNoteCreateInputSchema
>;
export type GameScoreAdminNoteUpdateInput = z.infer<
  typeof GameScoreAdminNoteUpdateInputSchema
>;
export type GameScoreAdminNoteDeleteInput = z.infer<
  typeof GameScoreAdminNoteDeleteInputSchema
>;

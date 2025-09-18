import { z } from 'zod';

import {
  BeatmapAttributeSchema,
  BeatmapSchema,
  BeatmapsetCompactSchema,
} from './beatmap';
import { AdminNoteSchema } from './common';
import { GameSchema, MatchSchema } from './match';
import { PlayerSchema } from './player';

export const VerificationStatusSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export type VerificationStatusValue = z.infer<typeof VerificationStatusSchema>;

export const TournamentListRequestSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(30),
  verified: z.boolean().optional(),
  searchQuery: z.string().trim().min(1).optional(),
  ruleset: z.number().int().nonnegative().optional(),
  dateMin: z.string().optional(),
  dateMax: z.string().optional(),
  verificationStatus: z.number().int().optional(),
  rejectionReason: z.number().int().optional(),
  submittedBy: z.number().int().optional(),
  verifiedBy: z.number().int().optional(),
  lobbySize: z.number().int().optional(),
  sort: z.number().int().optional(),
  descending: z.boolean().optional(),
});

export const TournamentListItemSchema = z.object({
  id: z.number().int(),
  created: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  forumUrl: z.string(),
  rankRangeLowerBound: z.number().int(),
  ruleset: z.number().int(),
  lobbySize: z.number().int(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
});

export const TournamentListResponseSchema = TournamentListItemSchema.array();

export const TournamentAdminNoteSchema = AdminNoteSchema;

const AdminNoteContentSchema = z.string().trim().min(1);

export const TournamentAdminNoteCreateInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const TournamentAdminNoteUpdateInputSchema = z.object({
  noteId: z.number().int().positive(),
  note: AdminNoteContentSchema,
});

export const TournamentAdminNoteDeleteInputSchema = z.object({
  noteId: z.number().int().positive(),
});

export const TournamentMatchGameSchema = GameSchema;

export const TournamentMatchSchema = MatchSchema;

export const TournamentPlayerStatsSchema = z.object({
  id: z.number().int(),
  playerId: z.number().int(),
  tournamentId: z.number().int(),
  matchesPlayed: z.number().int(),
  matchesWon: z.number().int(),
  matchesLost: z.number().int(),
  gamesPlayed: z.number().int(),
  gamesWon: z.number().int(),
  gamesLost: z.number().int(),
  averageMatchCost: z.number(),
  averageRatingDelta: z.number(),
  averageScore: z.number().int(),
  averagePlacement: z.number(),
  averageAccuracy: z.number(),
  teammateIds: z.array(z.number().int()),
  matchWinRate: z.number(),
  player: PlayerSchema,
});

export const TournamentBeatmapSchema = BeatmapSchema.extend({
  beatmapset: BeatmapsetCompactSchema.nullable().optional(),
  attributes: z.array(BeatmapAttributeSchema).default([]),
  creators: z.array(PlayerSchema).default([]),
});

export const TournamentDetailSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    abbreviation: z.string(),
    forumUrl: z.string(),
    rankRangeLowerBound: z.number().int(),
    ruleset: z.number().int(),
    lobbySize: z.number().int(),
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
    verificationStatus: z.number().int(),
    rejectionReason: z.number().int(),
    matches: TournamentMatchSchema.array(),
    adminNotes: TournamentAdminNoteSchema.array(),
    playerTournamentStats: TournamentPlayerStatsSchema.array(),
    pooledBeatmaps: TournamentBeatmapSchema.array(),
  })
  .transform((value) => ({
    ...value,
    matches: value.matches ?? [],
    adminNotes: value.adminNotes ?? [],
    playerTournamentStats: value.playerTournamentStats ?? [],
    pooledBeatmaps: value.pooledBeatmaps ?? [],
  }));

export const TournamentAdminUpdateInputSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  abbreviation: z.string().min(1),
  forumUrl: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith('https://osu.ppy.sh/community/forums/topics/') ||
        value.startsWith('https://osu.ppy.sh/wiki/en/Tournaments/'),
      {
        message:
          'Forum URL must be from "https://osu.ppy.sh/community/forums/topics/" or "https://osu.ppy.sh/wiki/en/Tournaments/"',
      }
    ),
  rankRangeLowerBound: z.number().int().min(1),
  ruleset: z.number().int().min(0),
  lobbySize: z.number().int().min(1).max(8),
  verificationStatus: VerificationStatusSchema,
  rejectionReason: z.number().int().min(0),
  startTime: z.string().datetime().nullable(),
  endTime: z.string().datetime().nullable(),
});

export const TournamentIdInputSchema = z.object({
  id: z.number().int().positive(),
});

export const TournamentResetAutomatedChecksInputSchema =
  TournamentIdInputSchema.extend({
    overrideVerifiedState: z.boolean().optional().default(false),
  });

export const TournamentAdminMutationResponseSchema = z.object({
  success: z.boolean(),
});

export const TournamentRefetchMatchDataResponseSchema = z.object({
  success: z.boolean(),
  matchesUpdated: z.number().int().nonnegative(),
});

export type TournamentAdminUpdateInput = z.infer<
  typeof TournamentAdminUpdateInputSchema
>;
export type TournamentAdminMutationResponse = z.infer<
  typeof TournamentAdminMutationResponseSchema
>;
export type TournamentResetAutomatedChecksInput = z.infer<
  typeof TournamentResetAutomatedChecksInputSchema
>;
export type TournamentIdInput = z.infer<typeof TournamentIdInputSchema>;
export type TournamentRefetchMatchDataResponse = z.infer<
  typeof TournamentRefetchMatchDataResponseSchema
>;

export type TournamentListRequest = z.infer<typeof TournamentListRequestSchema>;
export type TournamentListItem = z.infer<typeof TournamentListItemSchema>;
export type TournamentAdminNote = z.infer<typeof TournamentAdminNoteSchema>;
export type TournamentAdminNoteCreateInput = z.infer<
  typeof TournamentAdminNoteCreateInputSchema
>;
export type TournamentAdminNoteUpdateInput = z.infer<
  typeof TournamentAdminNoteUpdateInputSchema
>;
export type TournamentAdminNoteDeleteInput = z.infer<
  typeof TournamentAdminNoteDeleteInputSchema
>;
export type TournamentMatchGame = z.infer<typeof TournamentMatchGameSchema>;
export type TournamentMatch = z.infer<typeof TournamentMatchSchema>;
export type TournamentPlayerStats = z.infer<typeof TournamentPlayerStatsSchema>;
export type TournamentBeatmap = z.infer<typeof TournamentBeatmapSchema>;
export type TournamentDetail = z.infer<typeof TournamentDetailSchema>;

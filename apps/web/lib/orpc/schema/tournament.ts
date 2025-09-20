import { z } from 'zod/v4';

import {
  playerTournamentStatsSelectSchema,
  tournamentSelectSchema,
} from './base';
import { BeatmapAttributeSchema, BeatmapSchema } from './beatmap';
import {
  CreatedUpdatedOmit,
  RulesetSchema,
  VerificationStatusSchema,
} from './constants';
import type { VerificationStatusValue } from './constants';
import { AdminNoteSchema } from './common';
import { GameSchema, MatchSchema } from './match';
import { PlayerSchema } from './player';
import { TournamentQuerySortType } from '@otr/core/osu';

export const TournamentListRequestSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(30),
  verified: z.boolean().optional(),
  searchQuery: z.string().trim().min(1).optional(),
  ruleset: RulesetSchema.optional(),
  dateMin: z.string().optional(),
  dateMax: z.string().optional(),
  verificationStatus: VerificationStatusSchema.optional(),
  rejectionReason: z.number().int().optional(),
  submittedBy: z.number().int().optional(),
  verifiedBy: z.number().int().optional(),
  lobbySize: z.number().int().optional(),
  sort: z.enum(TournamentQuerySortType).optional(),
  descending: z.boolean().optional(),
});

export const TournamentListItemSchema = tournamentSelectSchema
  .pick({
    id: true,
    created: true,
    name: true,
    abbreviation: true,
    forumUrl: true,
    rankRangeLowerBound: true,
    ruleset: true,
    lobbySize: true,
    startTime: true,
    endTime: true,
    verificationStatus: true,
    rejectionReason: true,
  })
  .extend({
    ruleset: RulesetSchema,
    verificationStatus: VerificationStatusSchema,
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

export const TournamentPlayerStatsSchema = playerTournamentStatsSelectSchema
  .omit({
    created: true,
  })
  .extend({
    player: PlayerSchema,
  });

export const TournamentBeatmapSchema = BeatmapSchema.extend({
  attributes: z.array(BeatmapAttributeSchema),
  creators: z.array(PlayerSchema),
});

const tournamentDetailBaseSchema = tournamentSelectSchema
  .omit(CreatedUpdatedOmit)
  .extend({
    ruleset: RulesetSchema,
    verificationStatus: VerificationStatusSchema,
    matches: z.array(MatchSchema),
    adminNotes: z.array(TournamentAdminNoteSchema),
    playerTournamentStats: z.array(TournamentPlayerStatsSchema),
    pooledBeatmaps: z.array(TournamentBeatmapSchema),
  });

export const TournamentDetailSchema = tournamentDetailBaseSchema.transform(
  (value) => ({
    ...value,
    matches: value.matches ?? [],
    adminNotes: value.adminNotes ?? [],
    playerTournamentStats: value.playerTournamentStats ?? [],
    pooledBeatmaps: value.pooledBeatmaps ?? [],
  })
);

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
  ruleset: RulesetSchema,
  lobbySize: z.number().int().min(1).max(8),
  verificationStatus: VerificationStatusSchema,
  rejectionReason: z.number().int().min(0),
  startTime: z.string().datetime().nullable(),
  endTime: z.string().datetime().nullable(),
});

export const TournamentIdInputSchema = z.object({
  id: z.number().int().positive(),
});

const BeatmapOsuIdSchema = z.number().int().min(1).max(20_000_000);

const BeatmapIdSchema = z.number().int().positive();

export const TournamentBeatmapAdminMutationInputSchema = z
  .object({
    tournamentId: z.number().int().positive(),
    addBeatmapOsuIds: z.array(BeatmapOsuIdSchema).default([]),
    removeBeatmapIds: z.array(BeatmapIdSchema).default([]),
  })
  .check((ctx) => {
    const {
      value: { addBeatmapOsuIds, removeBeatmapIds },
      issues,
    } = ctx;

    if (addBeatmapOsuIds.length > 0 || removeBeatmapIds.length > 0) {
      return;
    }

    issues.push({
      code: 'custom',
      message: 'At least one beatmap ID must be provided',
      path: ['addBeatmapOsuIds'],
      input: addBeatmapOsuIds,
    });
  });

export const TournamentBeatmapAdminMutationResponseSchema = z.object({
  success: z.boolean(),
  addedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
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
export type TournamentBeatmapAdminMutationInput = z.infer<
  typeof TournamentBeatmapAdminMutationInputSchema
>;
export type TournamentBeatmapAdminMutationResponse = z.infer<
  typeof TournamentBeatmapAdminMutationResponseSchema
>;
export type TournamentResetAutomatedChecksInput = z.infer<
  typeof TournamentResetAutomatedChecksInputSchema
>;
export type TournamentIdInput = z.infer<typeof TournamentIdInputSchema>;
export type TournamentRefetchMatchDataResponse = z.infer<
  typeof TournamentRefetchMatchDataResponseSchema
>;
export type { VerificationStatusValue };

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

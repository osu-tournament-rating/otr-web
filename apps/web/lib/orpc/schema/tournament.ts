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
  verificationStatus: z.array(VerificationStatusSchema).optional(),
  rejectionReason: z.number().int().optional(),
  submittedBy: z.number().int().optional(),
  verifiedBy: z.number().int().optional(),
  lobbySize: z.array(z.number().int().min(1).max(8)).optional(),
  minRankRange: z.number().int().min(1).optional(),
  maxRankRange: z.number().int().min(1).optional(),
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
    isLazer: true,
  })
  .extend({
    ruleset: RulesetSchema,
    verificationStatus: VerificationStatusSchema,
    submittedByUsername: z.string().nullable(),
    verifiedByUsername: z.string().nullable(),
  });

export const TournamentListResponseSchema = TournamentListItemSchema.array();

export const PlayerTournamentListItemSchema = TournamentListItemSchema.extend({
  matchesWon: z.number().int(),
  matchesLost: z.number().int(),
});

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
    ratingBefore: z.number(),
    ratingAfter: z.number(),
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
    matches: z.array(MatchSchema).default([]),
    adminNotes: z.array(TournamentAdminNoteSchema).default([]),
    playerTournamentStats: z.array(TournamentPlayerStatsSchema).default([]),
    pooledBeatmaps: z.array(TournamentBeatmapSchema).default([]),
    submittedByUsername: z.string().nullable(),
    verifiedByUsername: z.string().nullable(),
  });

export const TournamentDetailSchema = tournamentDetailBaseSchema;

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
  warnings: z.array(z.string().min(1)).optional(),
});

export const TournamentResetAutomatedChecksInputSchema =
  TournamentIdInputSchema.extend({
    overrideVerifiedState: z.boolean().optional().default(false),
  });

export const TournamentAdminMutationResponseSchema = z.object({
  success: z.boolean(),
  warnings: z.array(z.string().min(1)).optional(),
});

export const TournamentRefetchMatchDataResponseSchema = z.object({
  success: z.boolean(),
  matchesUpdated: z.number().int().nonnegative(),
  warnings: z.array(z.string().min(1)).optional(),
});

export const TournamentRefetchBeatmapDataResponseSchema = z.object({
  success: z.boolean(),
  beatmapsUpdated: z.number().int().nonnegative(),
  beatmapsSkipped: z.number().int().nonnegative(),
  warnings: z.array(z.string().min(1)).optional(),
});

const MatchOsuIdSchema = z.number().int().min(1).max(2_000_000_000);
const MatchIdSchema = z.number().int().positive();

export const TournamentMatchAdminMutationInputSchema = z
  .object({
    tournamentId: z.number().int().positive(),
    addMatchOsuIds: z
      .array(
        z.object({
          osuId: MatchOsuIdSchema,
          isLazer: z.boolean().default(false),
        })
      )
      .default([]),
    removeMatchIds: z.array(MatchIdSchema).default([]),
  })
  .check((ctx) => {
    const {
      value: { addMatchOsuIds, removeMatchIds },
      issues,
    } = ctx;

    if (addMatchOsuIds.length > 0 || removeMatchIds.length > 0) {
      return;
    }

    issues.push({
      code: 'custom',
      message: 'At least one match must be provided to add or remove',
      path: ['addMatchOsuIds'],
      input: addMatchOsuIds,
    });
  });

export const TournamentMatchAdminMutationResponseSchema = z.object({
  success: z.boolean(),
  addedCount: z.number().int().nonnegative(),
  skippedCount: z.number().int().nonnegative(),
  removedCount: z.number().int().nonnegative(),
  warnings: z.array(z.string().min(1)).optional(),
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
export type TournamentRefetchBeatmapDataResponse = z.infer<
  typeof TournamentRefetchBeatmapDataResponseSchema
>;
export type { VerificationStatusValue };

export type TournamentListRequest = z.infer<typeof TournamentListRequestSchema>;
export type TournamentListItem = z.infer<typeof TournamentListItemSchema>;
export type PlayerTournamentListItem = z.infer<
  typeof PlayerTournamentListItemSchema
>;
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
export type TournamentMatchAdminMutationInput = z.infer<
  typeof TournamentMatchAdminMutationInputSchema
>;
export type TournamentMatchAdminMutationResponse = z.infer<
  typeof TournamentMatchAdminMutationResponseSchema
>;

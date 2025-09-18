import { z } from 'zod';

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

// TODO: Replace with standard PlayerSchema
const AdminNotePlayerSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  username: z.string(),
  country: z.string().nullable(),
  defaultRuleset: z.number().int(),
  userId: z.number().int().nullable().optional(),
});

const AdminNoteUserSchema = z.object({
  id: z.number().int(),
  lastLogin: z.string().nullable().optional(),
  player: AdminNotePlayerSchema,
});

export const TournamentAdminNoteSchema = z.object({
  id: z.number().int(),
  referenceId: z.number().int(),
  note: z.string(),
  created: z.string(),
  updated: z.string().nullable(),
  adminUser: AdminNoteUserSchema,
});

// TODO: Use common GameSchema instead
export const TournamentMatchGameSchema = z.object({
  id: z.number().int(),
  startTime: z.string().nullable(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
  warningFlags: z.number().int(),
  mods: z.number().int(),
  beatmap: z
    .object({
      osuId: z.number().int(),
    })
    .nullable(),
});

// TODO: Use common MatchSchema instead
export const TournamentMatchSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  verificationStatus: z.number().int(),
  rejectionReason: z.number().int(),
  warningFlags: z.number().int(),
  games: TournamentMatchGameSchema.array(),
});

// TODO: Use common PlayerSchema instead
const TournamentPlayerSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  username: z.string(),
  country: z.string().nullable(),
});

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
  player: TournamentPlayerSchema,
});

// TODO: Use common PlayerSchema
const BeatmapsetCreatorSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  username: z.string(),
  country: z.string().nullable(),
});

// TODO: Refactor BeatmapsetSchema
export const BeatmapsetCompactSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  artist: z.string(),
  title: z.string(),
  rankedStatus: z.number().int(),
  rankedDate: z.string().nullable(),
  submittedDate: z.string().nullable(),
  creatorId: z.number().int().nullable(),
  creator: BeatmapsetCreatorSchema.nullable(),
});

export const TournamentBeatmapSchema = z.object({
  id: z.number().int(),
  osuId: z.number().int(),
  ruleset: z.number().int(),
  rankedStatus: z.number().int(),
  diffName: z.string(),
  totalLength: z.number().int(),
  drainLength: z.number().int(),
  bpm: z.number(),
  countCircle: z.number().int(),
  countSlider: z.number().int(),
  countSpinner: z.number().int(),
  cs: z.number(),
  hp: z.number(),
  od: z.number(),
  ar: z.number(),
  sr: z.number(),
  maxCombo: z.number().int().nullable(),
  beatmapsetId: z.number().int().nullable(),
  beatmapset: BeatmapsetCompactSchema.nullable(),
  // TODO: Replace unknown with zod schema for beatmap attributes
  attributes: z.array(z.unknown()).default([]),
  // TODO: Replace TournamentPlayerSchema with a basic PlayerSchema
  creators: z.array(TournamentPlayerSchema).default([]),
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
export type TournamentMatchGame = z.infer<typeof TournamentMatchGameSchema>;
export type TournamentMatch = z.infer<typeof TournamentMatchSchema>;
export type TournamentPlayerStats = z.infer<typeof TournamentPlayerStatsSchema>;
export type TournamentBeatmap = z.infer<typeof TournamentBeatmapSchema>;
export type TournamentDetail = z.infer<typeof TournamentDetailSchema>;

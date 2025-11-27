import { z } from 'zod/v4';

import { ReportEntityType, ReportStatus } from '@otr/core/osu/enums';

import { dataReportSelectSchema } from './base';
import { RulesetSchema } from './constants';

export const TournamentReportableFields = [
  'name',
  'abbreviation',
  'forumUrl',
  'rankRangeLowerBound',
  'lobbySize',
  'startTime',
  'endTime',
] as const;

export const MatchReportableFields = ['name', 'startTime', 'endTime'] as const;

export const GameReportableFields = [
  'ruleset',
  'scoringType',
  'teamType',
  'mods',
  'startTime',
  'endTime',
] as const;

export const ScoreReportableFields = [
  'score',
  'accuracy',
  'maxCombo',
  'mods',
  'team',
] as const;

export type TournamentReportableField =
  (typeof TournamentReportableFields)[number];
export type MatchReportableField = (typeof MatchReportableFields)[number];
export type GameReportableField = (typeof GameReportableFields)[number];
export type ScoreReportableField = (typeof ScoreReportableFields)[number];

export const ReportableFieldsMap = {
  [ReportEntityType.Tournament]: TournamentReportableFields,
  [ReportEntityType.Match]: MatchReportableFields,
  [ReportEntityType.Game]: GameReportableFields,
  [ReportEntityType.Score]: ScoreReportableFields,
} as const;

export const ReportCreateInputSchema = z.object({
  entityType: z.nativeEnum(ReportEntityType),
  entityId: z.number().int().positive(),
  suggestedChanges: z
    .record(z.string(), z.string())
    .refine(
      (obj) => Object.keys(obj).length > 0,
      'At least one field change required'
    ),
  justification: z
    .string()
    .min(10, 'Justification must be at least 10 characters'),
});

export const ReportListInputSchema = z.object({
  status: z.nativeEnum(ReportStatus).optional(),
  entityType: z.nativeEnum(ReportEntityType).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const ReportResolveInputSchema = z.object({
  reportId: z.number().int().positive(),
  status: z.union([
    z.literal(ReportStatus.Approved),
    z.literal(ReportStatus.Rejected),
  ]),
  adminNote: z.string().max(500).optional(),
  applyChanges: z.boolean().default(false),
});

export const ReportGetInputSchema = z.object({
  reportId: z.number().int().positive(),
});

const reportPlayerSchema = z.object({
  id: z.number().int().positive(),
  osuId: z.number().int().positive(),
  username: z.string(),
  country: z.string(),
  defaultRuleset: RulesetSchema,
});

const reportUserSchema = z.object({
  id: z.number().int().positive(),
  player: reportPlayerSchema,
});

const reportBaseSchema = dataReportSelectSchema.pick({
  id: true,
  entityType: true,
  entityId: true,
  suggestedChanges: true,
  justification: true,
  status: true,
  adminNote: true,
  created: true,
  resolvedAt: true,
});

export const ReportSchema = reportBaseSchema.extend({
  reporter: reportUserSchema,
  resolvedBy: reportUserSchema.nullable(),
  entityDisplayName: z.string(),
});

export const ReportListResponseSchema = z.object({
  reports: z.array(ReportSchema),
  totalCount: z.number().int().nonnegative(),
});

export const ReportMutationResponseSchema = z.object({
  success: z.boolean(),
  reportId: z.number().int().positive().optional(),
});

export type ReportCreateInput = z.infer<typeof ReportCreateInputSchema>;
export type ReportListInput = z.infer<typeof ReportListInputSchema>;
export type ReportResolveInput = z.infer<typeof ReportResolveInputSchema>;
export type ReportGetInput = z.infer<typeof ReportGetInputSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type ReportListResponse = z.infer<typeof ReportListResponseSchema>;
export type ReportMutationResponse = z.infer<
  typeof ReportMutationResponseSchema
>;

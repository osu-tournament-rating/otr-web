import { z } from 'zod/v4';

import { AuditActionType, ReportEntityType } from '@otr/core/osu';

export const AuditEntityTypeSchema = z
  .enum(ReportEntityType)
  .describe('AuditEntityType: 0=Tournament, 1=Match, 2=Game, 3=Score');

export const AuditActionTypeSchema = z
  .enum(AuditActionType)
  .describe('AuditActionType: 0=Insert, 1=Update, 2=Delete');

export const AuditSortTypeSchema = z.enum(['created', 'id']);

export const AuditListInputSchema = z.object({
  entityType: AuditEntityTypeSchema.optional(),
  actionUserId: z.number().int().optional(),
  userActionsOnly: z.boolean().default(false),
  referenceId: z.number().int().optional(),
  cursor: z.number().int().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  sort: AuditSortTypeSchema.default('created'),
  descending: z.boolean().default(true),
});

export const AuditGetInputSchema = z.object({
  entityType: AuditEntityTypeSchema,
  id: z.number().int().positive(),
});

export const AuditEntityHistoryInputSchema = z.object({
  entityType: AuditEntityTypeSchema,
  referenceIdLock: z.number().int().positive(),
  cursor: z.number().int().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const GetEntityStateInputSchema = z.object({
  entityType: AuditEntityTypeSchema,
  referenceIdLock: z.number().int().positive(),
});

export const RecentlyAuditedEntitySchema = z.object({
  referenceIdLock: z.number().int().positive(),
  entityDisplayName: z.string(),
  lastAuditDate: z.string(),
  auditCount: z.number().int(),
});

export const ListRecentlyAuditedEntitiesInputSchema = z.object({
  limit: z.number().int().min(1).max(20).default(10),
});

export const ListRecentlyAuditedEntitiesResponseSchema = z.object({
  tournaments: z.array(RecentlyAuditedEntitySchema),
  matches: z.array(RecentlyAuditedEntitySchema),
  games: z.array(RecentlyAuditedEntitySchema),
  scores: z.array(RecentlyAuditedEntitySchema),
});

const auditPlayerSchema = z.object({
  id: z.number().int().positive(),
  osuId: z.number().int().positive(),
  username: z.string(),
  country: z.string(),
});

const auditActorSchema = z
  .object({
    id: z.number().int().positive(),
    player: auditPlayerSchema.nullable(),
  })
  .nullable();

const changeValueSchema = z.object({
  originalValue: z.unknown().nullable(),
  newValue: z.unknown().nullable(),
});

export const AuditRecordSchema = z.object({
  id: z.number().int().positive(),
  entityType: AuditEntityTypeSchema,
  created: z.string(),
  referenceIdLock: z.number().int().positive(),
  referenceId: z.number().int().positive().nullable(),
  actionUserId: z.number().int().positive().nullable(),
  actionType: AuditActionTypeSchema,
  changes: z.record(z.string(), changeValueSchema).nullable(),
  actor: auditActorSchema,
  entityDisplayName: z.string(),
});

export const AuditListResponseSchema = z.object({
  audits: z.array(AuditRecordSchema),
  nextCursor: z.number().int().nullable(),
  hasMore: z.boolean(),
});

export const AuditEntityStateSchema = z.object({
  exists: z.boolean(),
  data: z.unknown().nullable(),
  entityType: AuditEntityTypeSchema,
  entityDisplayName: z.string(),
});

export const AuditDetailResponseSchema = z.object({
  audit: AuditRecordSchema,
  entityState: AuditEntityStateSchema,
});

export type AuditEntityType = z.infer<typeof AuditEntityTypeSchema>;
export type AuditActionTypeValue = z.infer<typeof AuditActionTypeSchema>;
export type AuditListInput = z.infer<typeof AuditListInputSchema>;
export type AuditGetInput = z.infer<typeof AuditGetInputSchema>;
export type AuditEntityHistoryInput = z.infer<
  typeof AuditEntityHistoryInputSchema
>;
export type GetEntityStateInput = z.infer<typeof GetEntityStateInputSchema>;
export type RecentlyAuditedEntity = z.infer<typeof RecentlyAuditedEntitySchema>;
export type ListRecentlyAuditedEntitiesInput = z.infer<
  typeof ListRecentlyAuditedEntitiesInputSchema
>;
export type ListRecentlyAuditedEntitiesResponse = z.infer<
  typeof ListRecentlyAuditedEntitiesResponseSchema
>;
export type AuditRecord = z.infer<typeof AuditRecordSchema>;
export type AuditListResponse = z.infer<typeof AuditListResponseSchema>;
export type AuditEntityState = z.infer<typeof AuditEntityStateSchema>;
export type AuditDetailResponse = z.infer<typeof AuditDetailResponseSchema>;

export const TournamentAuditSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  abbreviation: z.string().nullable(),
  tournamentChanges: z.number().int(),
  matchChanges: z.number().int(),
  gameChanges: z.number().int(),
  scoreChanges: z.number().int(),
  lastActivity: z.string(),
});

export const TournamentAuditListInputSchema = z.object({
  cursor: z.number().int().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  searchQuery: z.string().optional(),
  changedProperties: z
    .array(
      z.object({ property: z.string(), entityType: AuditEntityTypeSchema })
    )
    .optional(),
  entityTypesWithChanges: z.array(AuditEntityTypeSchema).optional(),
  userActionsOnly: z.boolean().default(false),
  actionUserId: z.number().int().optional(),
  activityAfter: z.string().optional(),
  activityBefore: z.string().optional(),
});

export const TournamentAuditListResponseSchema = z.object({
  tournaments: z.array(TournamentAuditSummarySchema),
  nextCursor: z.number().int().nullable(),
  hasMore: z.boolean(),
});

export const TournamentTimelineInputSchema = z.object({
  tournamentId: z.number().int().positive(),
  cursor: z.number().int().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  changedProperties: z
    .array(
      z.object({ property: z.string(), entityType: AuditEntityTypeSchema })
    )
    .optional(),
});

export const TournamentTimelineAuditSchema = AuditRecordSchema.extend({
  parentEntityId: z.number().int().nullable(),
  parentEntityName: z.string().nullable(),
});

export const TournamentTimelineResponseSchema = z.object({
  audits: z.array(TournamentTimelineAuditSchema),
  nextCursor: z.number().int().nullable(),
  hasMore: z.boolean(),
});

export const FilterPropertySchema = z.object({
  name: z.string(),
  entityType: AuditEntityTypeSchema,
});

export const PropertyFilterSchema = z.object({
  property: z.string(),
  entityType: AuditEntityTypeSchema,
});

export const FilterOptionsResponseSchema = z.object({
  properties: z.array(FilterPropertySchema),
});

export type TournamentAuditSummary = z.infer<
  typeof TournamentAuditSummarySchema
>;
export type TournamentAuditListInput = z.infer<
  typeof TournamentAuditListInputSchema
>;
export type TournamentAuditListResponse = z.infer<
  typeof TournamentAuditListResponseSchema
>;
export type TournamentTimelineInput = z.infer<
  typeof TournamentTimelineInputSchema
>;
export type TournamentTimelineAudit = z.infer<
  typeof TournamentTimelineAuditSchema
>;
export type TournamentTimelineResponse = z.infer<
  typeof TournamentTimelineResponseSchema
>;
export type FilterProperty = z.infer<typeof FilterPropertySchema>;
export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;
export type FilterOptionsResponse = z.infer<typeof FilterOptionsResponseSchema>;

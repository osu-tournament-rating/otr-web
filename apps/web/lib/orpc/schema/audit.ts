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
export type AuditRecord = z.infer<typeof AuditRecordSchema>;
export type AuditListResponse = z.infer<typeof AuditListResponseSchema>;
export type AuditEntityState = z.infer<typeof AuditEntityStateSchema>;
export type AuditDetailResponse = z.infer<typeof AuditDetailResponseSchema>;

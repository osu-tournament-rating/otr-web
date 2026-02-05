import { z } from 'zod';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';

// --- Pagination ---

export const CursorPaginationInputSchema = z.object({
  cursor: z.number().int().optional(),
  limit: z.number().int().min(1).max(1000).default(250),
});

// --- Audit Entry ---

export const AuditActionUserSchema = z.object({
  id: z.number().int(),
  playerId: z.number().int().nullable(),
  osuId: z.number().int().nullable(),
  username: z.string().nullable(),
});

export const AuditEntrySchema = z.object({
  id: z.number().int(),
  entityType: z.nativeEnum(AuditEntityType),
  referenceIdLock: z.number().int(),
  referenceId: z.number().int().nullable(),
  actionUserId: z.number().int().nullable(),
  actionType: z.nativeEnum(AuditActionType),
  changes: z.record(z.string(), z.unknown()).nullable(),
  created: z.string(),
  actionUser: AuditActionUserSchema.nullable(),
  /** Map of user IDs to user info for IDs referenced in changes (e.g. verifiedByUserId) */
  referencedUsers: z.record(z.string(), AuditActionUserSchema).optional(),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

// --- Admin Note in Timeline ---

export const AuditAdminNoteSchema = z.object({
  id: z.number().int(),
  note: z.string(),
  created: z.string(),
  updated: z.string().nullable(),
  adminUser: AuditActionUserSchema.nullable(),
});

export type AuditAdminNote = z.infer<typeof AuditAdminNoteSchema>;

// --- Timeline Item (discriminated union) ---

export const AuditTimelineAuditItemSchema = z.object({
  type: z.literal('audit'),
  data: AuditEntrySchema,
});

export const AuditTimelineNoteItemSchema = z.object({
  type: z.literal('note'),
  data: AuditAdminNoteSchema,
});

export const AuditTimelineItemSchema = z.discriminatedUnion('type', [
  AuditTimelineAuditItemSchema,
  AuditTimelineNoteItemSchema,
]);

export type AuditTimelineItem = z.infer<typeof AuditTimelineItemSchema>;

// --- Timeline Response ---

export const AuditTimelineResponseSchema = z.object({
  items: z.array(AuditTimelineItemSchema),
  nextCursor: z.number().int().nullable(),
  hasMore: z.boolean(),
});

// --- Per-Entity Input ---

export const EntityAuditInputSchema = CursorPaginationInputSchema.extend({
  entityType: z.nativeEnum(AuditEntityType),
  entityId: z.number().int().positive(),
});

// --- Field Filter ---

export const FieldFilterSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  fieldName: z.string(),
});

export type FieldFilter = z.infer<typeof FieldFilterSchema>;

// --- Search Input ---

export const AuditSearchInputSchema = CursorPaginationInputSchema.extend({
  entityTypes: z.array(z.nativeEnum(AuditEntityType)).optional(),
  actionTypes: z.array(z.nativeEnum(AuditActionType)).optional(),
  adminOnly: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  adminUserId: z.number().int().optional(),
  /** Structured field filters with entity type context - OR logic: match any */
  fieldsChanged: z.array(FieldFilterSchema).optional(),
  entityId: z.number().int().optional(),
  changeValue: z.string().optional(),
});

// --- Grouped Entry (for default view) ---

export const AuditGroupedEntrySchema = z.object({
  actionUserId: z.number().int().nullable(),
  actionUser: AuditActionUserSchema.nullable(),
  entityType: z.nativeEnum(AuditEntityType),
  actionType: z.nativeEnum(AuditActionType),
  changedFields: z.array(z.string()),
  entries: z.array(AuditEntrySchema),
  latestCreated: z.string(),
  count: z.number().int(),
});

export type AuditGroupedEntry = z.infer<typeof AuditGroupedEntrySchema>;

// --- Default View Response ---

export const AuditDefaultViewResponseSchema = z.object({
  groups: z.array(AuditGroupedEntrySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// --- Admin Users Response ---

export const AuditAdminUserSchema = z.object({
  userId: z.number().int(),
  playerId: z.number().int().nullable(),
  osuId: z.number().int().nullable(),
  username: z.string().nullable(),
});

export const AuditAdminUsersResponseSchema = z.object({
  users: z.array(AuditAdminUserSchema),
});

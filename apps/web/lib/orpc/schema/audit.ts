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
  /** Resolved entity name (for tournaments and matches) */
  entityName: z.string().nullable().optional(),
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

// --- Group Summary (for default activity view, SQL-level grouping) ---

export const AuditGroupSummarySchema = z.object({
  actionUserId: z.number().int().nullable(),
  actionUser: AuditActionUserSchema.nullable(),
  entityType: z.nativeEnum(AuditEntityType),
  actionType: z.nativeEnum(AuditActionType),
  changedFields: z.array(z.string()),
  count: z.number().int(),
  latestCreated: z.string(),
  earliestCreated: z.string(),
  /** Sample changes from one entry for batch detection (verification status, etc.) */
  sampleChanges: z.record(z.string(), z.unknown()).nullable(),
  /** Sample referenceIdLock for parent entity identification */
  sampleReferenceIdLock: z.number().int(),
  /** Sorted comma-separated JSONB keys, used to identify the group for lazy loading */
  changedFieldsKey: z.string(),
  /** Parent tournament ID (populated for all entity types via parent entity resolution) */
  parentEntityId: z.number().int().nullable(),
  /** Tournament name (populated for all entity types via parent entity resolution) */
  tournamentName: z.string().nullable().optional(),
});

export type AuditGroupSummary = z.infer<typeof AuditGroupSummarySchema>;

// --- Activity Pagination Input (grouping-based, with optional search filters) ---

export const ActivityPaginationInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(30),
  // Optional search filters (when provided, searches across all entity types)
  entityTypes: z.array(z.nativeEnum(AuditEntityType)).optional(),
  actionTypes: z.array(z.nativeEnum(AuditActionType)).optional(),
  adminOnly: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  adminUserId: z.number().int().optional(),
  fieldsChanged: z.array(FieldFilterSchema).optional(),
  entityId: z.number().int().optional(),
});

// --- Activity Response ---

export const AuditActivityResponseSchema = z.object({
  groups: z.array(AuditGroupSummarySchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// --- Group Entries Input/Response (lazy loading within a group) ---

export const GroupEntriesInputSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  actionUserId: z.number().int().nullable(),
  actionType: z.nativeEnum(AuditActionType),
  parentEntityId: z.number().int().nullable(),
  changedFieldsKey: z.string(),
  cursor: z.number().int().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const GroupEntriesResponseSchema = z.object({
  entries: z.array(AuditEntrySchema),
  nextCursor: z.number().int().nullable(),
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

// --- Batch Child Counts (lazy-loaded game/score counts for expanded batches) ---

export const BatchChildCountsInputSchema = z.object({
  /** The action user who performed the batch operation */
  actionUserId: z.number().int().nullable(),
  /** Parent tournament ID for filtering */
  parentEntityId: z.number().int().nullable(),
  /** Earliest timestamp in the batch window (optional optimization) */
  timeFrom: z.string().optional(),
  /** Latest timestamp in the batch window (optional optimization) */
  timeTo: z.string().optional(),
  /** Which entity types to count (typically Game + Score) */
  entityTypes: z.array(z.nativeEnum(AuditEntityType)),
});

export const BatchChildCountsResponseSchema = z.object({
  counts: z.array(
    z.object({
      entityType: z.nativeEnum(AuditEntityType),
      count: z.number().int(),
    })
  ),
});

// --- Batch Entity IDs (expandable ID list for batch operations) ---

export const BatchEntityIdsInputSchema = z.object({
  actionUserId: z.number().int().nullable(),
  parentEntityId: z.number().int().nullable(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  entityTypes: z.array(z.nativeEnum(AuditEntityType)),
});

export const BatchEntityInfoSchema = z.object({
  id: z.number().int(),
  name: z.string().nullable(),
});

export type BatchEntityInfo = z.infer<typeof BatchEntityInfoSchema>;

export const BatchEntityIdsResponseSchema = z.object({
  entities: z.array(
    z.object({
      entityType: z.nativeEnum(AuditEntityType),
      ids: z.array(z.number().int()),
      /** Entity details with resolved names (for tournaments and matches) */
      items: z.array(BatchEntityInfoSchema).optional(),
    })
  ),
});

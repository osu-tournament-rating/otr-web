import { z } from 'zod/v4';
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

export type AuditActionUser = z.infer<typeof AuditActionUserSchema>;

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

// --- Audit Event Action (semantic classification) ---

export const AuditEventActionSchema = z.enum([
  'verification',
  'rejection',
  'pre_verification',
  'pre_rejection',
  'submission',
  'update',
  'deletion',
]);

export type AuditEventAction = z.infer<typeof AuditEventActionSchema>;

// --- Audit Event (assembled from grouped audit entries) ---

export const AuditEventChildLevelSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  affectedCount: z.number().int(),
  /** Total children in parent entity (for "85 of 118" display). Null if not computed. */
  totalCount: z.number().int().nullable(),
});

export const AuditEventSchema = z.object({
  /** Semantic action derived from top-level entity's verificationStatus change */
  action: AuditEventActionSchema,
  /** Who performed the action (null = system) */
  actionUserId: z.number().int().nullable(),
  actionUser: AuditActionUserSchema.nullable(),
  /** Exact transaction timestamp (shared across all entries in this event) */
  created: z.string(),
  /** Whether this was a system action (no actionUserId) */
  isSystem: z.boolean(),
  /** The top-level entity in the hierarchy */
  topEntity: z.object({
    entityType: z.nativeEnum(AuditEntityType),
    entityId: z.number().int(),
    entityName: z.string().nullable(),
    /** How many entities of this type were affected (usually 1 for cascades) */
    count: z.number().int(),
  }),
  /** One sublevel child count (immediate children affected by cascade) */
  childLevel: AuditEventChildLevelSchema.nullable(),
  /** Whether this event spans multiple entity types (cascade) */
  isCascade: z.boolean(),
  /** Parent tournament context (null when topEntity is a tournament) */
  parentTournament: z
    .object({
      id: z.number().int(),
      name: z.string().nullable(),
    })
    .nullable(),
  /** Fields changed on the top-level entity */
  changedFields: z.array(z.string()),
  /** Sample changes from the top-level entity for expandable diff */
  sampleChanges: z.record(z.string(), z.unknown()).nullable(),
  /** Resolved user info for user IDs referenced in changes */
  referencedUsers: z.record(z.string(), AuditActionUserSchema).optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// --- Event Feed Input/Response ---

export const EventFeedInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(30),
  entityTypes: z.array(z.nativeEnum(AuditEntityType)).optional(),
  actionTypes: z.array(z.nativeEnum(AuditActionType)).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  adminUserId: z.number().int().optional(),
  fieldsChanged: z.array(FieldFilterSchema).optional(),
  entityId: z.number().int().optional(),
  /** Whether to include system (non-admin) events. Default: false */
  showSystem: z.boolean().optional(),
});

export const EventFeedResponseSchema = z.object({
  events: z.array(AuditEventSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

// --- Event Details Input/Response (expandable view of a single event) ---

export const EventDetailsInputSchema = z.object({
  actionUserId: z.number().int().nullable(),
  created: z.string(),
  entityType: z.nativeEnum(AuditEntityType).optional(),
  cursor: z.number().int().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const EventDetailsResponseSchema = z.object({
  entries: z.array(AuditEntrySchema),
  nextCursor: z.number().int().nullable(),
  hasMore: z.boolean(),
});

// --- Entity Timeline (enhanced with cascade context) ---

export const CascadeContextSchema = z.object({
  topEntityType: z.nativeEnum(AuditEntityType),
  topEntityId: z.number().int(),
  topEntityName: z.string().nullable(),
  action: AuditEventActionSchema,
  /** e.g., "also affected 85 of 118 matches" */
  childSummary: z.string().nullable(),
});

export const EntityTimelineEventSchema = z.object({
  entry: AuditEntrySchema,
  /** Populated when this entry was part of a cascade operation */
  cascadeContext: CascadeContextSchema.nullable(),
});

export type EntityTimelineEvent = z.infer<typeof EntityTimelineEventSchema>;

export const EntityTimelineAuditItemSchema = z.object({
  type: z.literal('audit'),
  data: EntityTimelineEventSchema,
});

export const EntityTimelineNoteItemSchema = z.object({
  type: z.literal('note'),
  data: AuditAdminNoteSchema,
});

export const EntityTimelineItemSchema = z.discriminatedUnion('type', [
  EntityTimelineAuditItemSchema,
  EntityTimelineNoteItemSchema,
]);

export type EntityTimelineItem = z.infer<typeof EntityTimelineItemSchema>;

export const EntityTimelineResponseSchema = z.object({
  items: z.array(EntityTimelineItemSchema),
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

// --- Search Input (kept for backward compatibility) ---

export const AuditSearchInputSchema = CursorPaginationInputSchema.extend({
  entityTypes: z.array(z.nativeEnum(AuditEntityType)).optional(),
  actionTypes: z.array(z.nativeEnum(AuditActionType)).optional(),
  adminOnly: z.boolean().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  adminUserId: z.number().int().optional(),
  fieldsChanged: z.array(FieldFilterSchema).optional(),
  entityId: z.number().int().optional(),
  changeValue: z.string().optional(),
});

// --- Legacy search response (kept for searchAudits procedure) ---

export const AuditTimelineResponseSchema = z.object({
  items: z.array(
    z.discriminatedUnion('type', [
      z.object({ type: z.literal('audit'), data: AuditEntrySchema }),
      z.object({ type: z.literal('note'), data: AuditAdminNoteSchema }),
    ])
  ),
  nextCursor: z.number().int().nullable(),
  hasMore: z.boolean(),
});

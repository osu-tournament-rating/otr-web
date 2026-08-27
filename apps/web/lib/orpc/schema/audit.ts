import { z } from 'zod';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';

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
  /** Users referenced inside `changes`, keyed by id. */
  referencedUsers: z.record(z.string(), AuditActionUserSchema).optional(),
  /** Resolved entity name, for tournaments and matches. */
  entityName: z.string().nullable().optional(),
});

export type AuditEntry = z.infer<typeof AuditEntrySchema>;

export const AuditAdminNoteSchema = z.object({
  id: z.number().int(),
  note: z.string(),
  created: z.string(),
  updated: z.string().nullable(),
  adminUser: AuditActionUserSchema.nullable(),
});

export type AuditAdminNote = z.infer<typeof AuditAdminNoteSchema>;

export const EntityAuditInputSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  entityId: z.number().int().positive(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  /** Include changes made by automated processing. Defaults to false. */
  showSystem: z.boolean().optional(),
});

export const FieldFilterSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  fieldName: z.string(),
});

export type FieldFilter = z.infer<typeof FieldFilterSchema>;

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

export const AuditEventActionCountSchema = z.object({
  action: AuditEventActionSchema,
  count: z.number().int(),
});

export type AuditEventActionCount = z.infer<typeof AuditEventActionCountSchema>;

export const AuditEventChildLevelSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  affectedCount: z.number().int(),
  /** Children in the parent entity, for the "85 of 118" display; null when not computed. */
  totalCount: z.number().int().nullable(),
});

export const AuditEventSchema = z.object({
  /** Stable feed identity, including a deterministic fallback for legacy rows. */
  eventKey: z.string().min(1),
  /** Stable database event ID for new audit rows; null for legacy history. */
  eventId: z.number().int().positive().nullable(),
  /** Derived from the top-level entity's `verificationStatus` change. */
  action: AuditEventActionSchema,
  /** Entities per outcome when the event wrote more than one verification status. */
  actionBreakdown: z.array(AuditEventActionCountSchema).nullable(),
  /** Null for system actions. */
  actionUserId: z.number().int().nullable(),
  actionUser: AuditActionUserSchema.nullable(),
  created: z.string(),
  isSystem: z.boolean(),
  topEntity: z.object({
    entityType: z.nativeEnum(AuditEntityType),
    entityId: z.number().int(),
    entityName: z.string().nullable(),
    /** Entities of this type affected; usually 1 outside cascades. */
    count: z.number().int(),
    /** How many audit rows were written for those entities in this event. */
    entryCount: z.number().int(),
  }),
  /** Immediate children affected by a cascade. */
  childLevel: AuditEventChildLevelSchema.nullable(),
  isCascade: z.boolean(),
  /** Null when `topEntity` is itself a tournament. */
  parentTournament: z
    .object({
      id: z.number().int(),
      name: z.string().nullable(),
    })
    .nullable(),
  changedFields: z.array(z.string()),
  /** Sample of the top-level entity's changes, for the expandable diff. */
  sampleChanges: z.record(z.string(), z.unknown()).nullable(),
  /** Users referenced inside `sampleChanges`, keyed by id. */
  referencedUsers: z.record(z.string(), AuditActionUserSchema).optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

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
  /** Defaults to false. */
  showSystem: z.boolean().optional(),
});

export const EventFeedResponseSchema = z.object({
  events: z.array(AuditEventSchema),
  nextCursor: z.string().nullable(),
  hasMore: z.boolean(),
});

export const EventDetailsInputSchema = z.object({
  /** Exact feed identity for legacy events without an eventId. */
  eventKey: z.string().min(1).optional(),
  /** Prefer this stable identifier for new events; legacy callers use actor + timestamp. */
  eventId: z.number().int().positive().optional(),
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

export const CascadeDescendantSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  affectedCount: z.number().int(),
  /** Children in the top entity, for the "85 of 118" display; null when not computed. */
  totalCount: z.number().int().nullable(),
});

export type CascadeDescendant = z.infer<typeof CascadeDescendantSchema>;

export const CascadeContextSchema = z.object({
  topEntityType: z.nativeEnum(AuditEntityType),
  topEntityId: z.number().int(),
  topEntityName: z.string().nullable(),
  action: AuditEventActionSchema,
  /** e.g. "also affected 85 of 118 matches". */
  childSummary: z.string().nullable(),
  /** Every level below the top entity that the event touched, nearest first. */
  descendants: z.array(CascadeDescendantSchema),
  /** Identifies the event so the affected entities can be listed. */
  eventId: z.number().int().positive().nullable(),
  actionUserId: z.number().int().nullable(),
  created: z.string(),
});

export type CascadeContext = z.infer<typeof CascadeContextSchema>;

export const EntityTimelineEventSchema = z.object({
  entry: AuditEntrySchema,
  /** Populated when the entry was part of a cascade. */
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
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  pages: z.number().int().min(0),
  total: z.number().int().nonnegative(),
  items: z.array(EntityTimelineItemSchema),
});

export const DescendantAuditInputSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  entityId: z.number().int().positive(),
  descendantType: z.nativeEnum(AuditEntityType),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(100).optional(),
  /** Include changes made by automated processing. Defaults to false. */
  showSystem: z.boolean().optional(),
});

export const DescendantAuditItemSchema = z.object({
  entry: AuditEntrySchema,
  entity: z.object({
    entityType: z.nativeEnum(AuditEntityType),
    entityId: z.number().int(),
    entityName: z.string().nullable(),
    /** Ancestors between the descendant and the requested entity, outermost first. */
    path: z.array(
      z.object({
        entityType: z.nativeEnum(AuditEntityType),
        entityId: z.number().int(),
        entityName: z.string().nullable(),
      })
    ),
  }),
});

export type DescendantAuditItem = z.infer<typeof DescendantAuditItemSchema>;

export const DescendantAuditResponseSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  pages: z.number().int().min(0),
  total: z.number().int().nonnegative(),
  /** True when `total` hit the counting cap and is a lower bound. */
  totalCapped: z.boolean(),
  items: z.array(DescendantAuditItemSchema),
});

export const DescendantAuditCountsInputSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  entityId: z.number().int().positive(),
  /** Include changes made by automated processing. Defaults to false. */
  showSystem: z.boolean().optional(),
});

export const DescendantAuditCountsResponseSchema = z.object({
  counts: z.array(
    z.object({
      entityType: z.nativeEnum(AuditEntityType),
      count: z.number().int().nonnegative(),
      /** True when `count` hit the counting cap and is a lower bound. */
      capped: z.boolean(),
    })
  ),
});

export type DescendantAuditCounts = z.infer<
  typeof DescendantAuditCountsResponseSchema
>;

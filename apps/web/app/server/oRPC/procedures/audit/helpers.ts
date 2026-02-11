import * as schema from '@otr/core/db/schema';
import {
  AuditActionType,
  AuditEntityType,
  VerificationStatus,
} from '@otr/core/osu';
import type {
  AuditEntry,
  AuditEventAction,
  EntityTimelineItem,
} from '@/lib/orpc/schema/audit';

/** Maps AuditEntityType to the corresponding Drizzle audit table */
export function getAuditTable(entityType: AuditEntityType) {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return schema.tournamentAudits;
    case AuditEntityType.Match:
      return schema.matchAudits;
    case AuditEntityType.Game:
      return schema.gameAudits;
    case AuditEntityType.Score:
      return schema.gameScoreAudits;
  }
}

/** Maps AuditEntityType to the corresponding Drizzle admin notes table */
export function getAdminNotesTable(entityType: AuditEntityType) {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return schema.tournamentAdminNotes;
    case AuditEntityType.Match:
      return schema.matchAdminNotes;
    case AuditEntityType.Game:
      return schema.gameAdminNotes;
    case AuditEntityType.Score:
      return schema.gameScoreAdminNotes;
  }
}

/** Maps AuditEntityType to the raw SQL table name string */
export function getTableNameString(entityType: AuditEntityType): string {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return 'tournament_audits';
    case AuditEntityType.Match:
      return 'match_audits';
    case AuditEntityType.Game:
      return 'game_audits';
    case AuditEntityType.Score:
      return 'game_score_audits';
  }
}

/** All audit tables in order matching AuditEntityType values */
export const ALL_AUDIT_TABLES = [
  { table: schema.tournamentAudits, entityType: AuditEntityType.Tournament },
  { table: schema.matchAudits, entityType: AuditEntityType.Match },
  { table: schema.gameAudits, entityType: AuditEntityType.Game },
  { table: schema.gameScoreAudits, entityType: AuditEntityType.Score },
] as const;

/** Lightweight subset for the default activity view (skips large game/score tables) */
export const LIGHT_AUDIT_TABLES = [
  { table: schema.tournamentAudits, entityType: AuditEntityType.Tournament },
  { table: schema.matchAudits, entityType: AuditEntityType.Match },
] as const;

/**
 * Get the SQL FROM clause (with JOINs) and parent entity ID expression
 * for resolving the parent tournament of each entity type.
 *
 * Tournament audits: reference_id_lock IS the tournament ID
 * Match audits: JOIN matches to get tournament_id
 * Game audits: JOIN games → matches to get tournament_id
 * Score audits: JOIN game_scores → games → matches to get tournament_id
 */
export function getParentEntityJoinInfo(entityType: AuditEntityType): {
  fromClause: string;
  parentIdExpr: string;
} {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return {
        fromClause: 'tournament_audits a',
        parentIdExpr: 'a.reference_id_lock',
      };
    case AuditEntityType.Match:
      return {
        fromClause:
          'match_audits a LEFT JOIN matches m ON m.id = a.reference_id_lock',
        parentIdExpr: 'm.tournament_id',
      };
    case AuditEntityType.Game:
      return {
        fromClause:
          'game_audits a LEFT JOIN games g ON g.id = a.reference_id_lock LEFT JOIN matches m ON m.id = g.match_id',
        parentIdExpr: 'm.tournament_id',
      };
    case AuditEntityType.Score:
      return {
        fromClause:
          'game_score_audits a LEFT JOIN game_scores gs ON gs.id = a.reference_id_lock LEFT JOIN games g ON g.id = gs.game_id LEFT JOIN matches m ON m.id = g.match_id',
        parentIdExpr: 'm.tournament_id',
      };
  }
}

/**
 * Compare two values for equality, handling objects/arrays via JSON serialization.
 */
function valuesAreEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Normalizes inner change value keys (originalValue/newValue) to camelCase.
 * Handles both PascalCase (NewValue/OriginalValue) and camelCase inputs.
 */
function normalizeChangeValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const [key, v] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === 'originalvalue') {
      result['originalValue'] = v;
    } else if (lowerKey === 'newvalue') {
      result['newValue'] = v;
    } else {
      result[key] = v;
    }
  }

  return result;
}

/**
 * Normalizes JSONB change keys from snake_case to camelCase.
 * The audit triggers store keys in snake_case, but historical data
 * was already camelized by a migration. This handles both cases.
 * Also normalizes inner value keys (originalValue/newValue) to camelCase.
 * Filters out fields where originalValue equals newValue (no actual change).
 */
export function camelizeChangesKeys(
  changes: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!changes) return null;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(changes)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) =>
      c.toUpperCase()
    );
    const normalizedValue = normalizeChangeValue(value);

    // Skip fields where originalValue equals newValue (no actual change)
    if (normalizedValue && typeof normalizedValue === 'object') {
      const { originalValue, newValue } = normalizedValue as {
        originalValue?: unknown;
        newValue?: unknown;
      };
      if (valuesAreEqual(originalValue, newValue)) {
        continue;
      }
    }

    result[camelKey] = normalizedValue;
  }

  // Return null if all fields were filtered out
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Merge-sort timeline items by created date descending.
 * Used to interleave audit entries and admin notes.
 */
export function mergeTimelineItems(
  ...arrays: EntityTimelineItem[][]
): EntityTimelineItem[] {
  const merged = arrays.flat();
  merged.sort((a, b) => {
    const dateA = new Date(getTimelineItemCreated(a)).getTime();
    const dateB = new Date(getTimelineItemCreated(b)).getTime();
    return dateB - dateA;
  });
  return merged;
}

function getTimelineItemCreated(item: EntityTimelineItem): string {
  return item.type === 'audit' ? item.data.entry.created : item.data.created;
}

/**
 * Merge-sort audit entries from multiple tables by created date descending.
 */
export function mergeAuditEntries(...arrays: AuditEntry[][]): AuditEntry[] {
  const merged = arrays.flat();
  merged.sort((a, b) => {
    const dateA = new Date(a.created).getTime();
    const dateB = new Date(b.created).getTime();
    return dateB - dateA;
  });
  return merged;
}

/** Convert camelCase to snake_case */
export function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
}

export { entityTypeToSlug } from '@/lib/audit-entity-types';

// --- Event Assembly ---

/**
 * A raw grouped row from the per-table SQL query, before cross-table merging.
 */
export type GroupedAuditRow = {
  actionUserId: number | null;
  created: string;
  actionType: AuditActionType;
  entityType: AuditEntityType;
  parentEntityId: number | null;
  entryCount: number;
  sampleChanges: Record<string, unknown> | null;
  sampleEntityId: number;
};

/**
 * Classify the semantic action from the top-level entity's sample changes.
 *
 * Uses the `verificationStatus.newValue` field exclusively to determine
 * whether this is a verification or rejection. This fixes the old bug where
 * `rejectionReason.newValue !== 0` was used as a fallback, which could
 * misidentify verifications as rejections.
 */
export function classifyAction(
  actionType: AuditActionType,
  sampleChanges: Record<string, unknown> | null,
  isSystem: boolean
): AuditEventAction {
  if (actionType === AuditActionType.Created) return 'submission';
  if (actionType === AuditActionType.Deleted) return 'deletion';

  if (!sampleChanges) return 'update';

  const changes = sampleChanges as Record<
    string,
    { originalValue: unknown; newValue: unknown }
  >;

  // Check verificationStatus change (handles both camelCase and snake_case keys)
  const vsChange = changes.verificationStatus ?? changes.verification_status;

  if (vsChange?.newValue !== undefined) {
    const newStatus = vsChange.newValue as number;

    switch (newStatus) {
      case VerificationStatus.Verified:
        return isSystem ? 'pre_verification' : 'verification';
      case VerificationStatus.Rejected:
        return isSystem ? 'pre_rejection' : 'rejection';
      case VerificationStatus.PreVerified:
        return 'pre_verification';
      case VerificationStatus.PreRejected:
        return 'pre_rejection';
    }
  }

  return 'update';
}

/**
 * Returns the immediate child entity type in the hierarchy.
 * Tournament → Match → Game → Score → null
 */
export function getImmediateChildType(
  entityType: AuditEntityType
): AuditEntityType | null {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return AuditEntityType.Match;
    case AuditEntityType.Match:
      return AuditEntityType.Game;
    case AuditEntityType.Game:
      return AuditEntityType.Score;
    case AuditEntityType.Score:
      return null;
  }
}

/** Entity type label for display (singular) */
export function entityTypeLabel(entityType: AuditEntityType): string {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return 'tournament';
    case AuditEntityType.Match:
      return 'match';
    case AuditEntityType.Game:
      return 'game';
    case AuditEntityType.Score:
      return 'score';
  }
}

/** Pluralize entity type label */
export function entityTypeLabelPlural(entityType: AuditEntityType): string {
  switch (entityType) {
    case AuditEntityType.Tournament:
      return 'tournaments';
    case AuditEntityType.Match:
      return 'matches';
    case AuditEntityType.Game:
      return 'games';
    case AuditEntityType.Score:
      return 'scores';
  }
}

/**
 * Extract changed field names from sample changes.
 */
export function extractChangedFields(
  sampleChanges: Record<string, unknown> | null
): string[] {
  if (!sampleChanges) return [];
  return Object.keys(sampleChanges).sort();
}

/** Assembled event type returned by assembleEvents() */
export type AssembledEvent = {
  action: AuditEventAction;
  actionUserId: number | null;
  created: string;
  /** Earliest timestamp in this group (for cursor-safe pagination of aggregated system events) */
  earliestCreated?: string;
  isSystem: boolean;
  topEntityType: AuditEntityType;
  topEntityId: number;
  topEntityCount: number;
  childEntityType: AuditEntityType | null;
  childAffectedCount: number;
  isCascade: boolean;
  parentEntityId: number | null;
  changedFields: string[];
  sampleChanges: Record<string, unknown> | null;
};

/**
 * Assemble grouped rows from multiple audit tables into audit events.
 *
 * Groups rows by (actionUserId, created, actionType) — entries sharing these values
 * came from the same PostgreSQL transaction (cascade operations).
 *
 * For each group:
 * 1. Identifies the top-level entity by hierarchy (lowest enum = highest in hierarchy)
 * 2. Classifies the action from the top-level entity's changes
 * 3. Computes one-sublevel child count
 *
 * System events (actionUserId=null) are further aggregated by
 * (parentEntityId, classifiedAction, hourBucket) to collapse per-match
 * rows into summary events.
 */
export function assembleEvents(rows: GroupedAuditRow[]): AssembledEvent[] {
  // Group by (actionUserId, created, actionType) — same transaction
  const eventMap = new Map<string, GroupedAuditRow[]>();
  for (const row of rows) {
    const key = `${row.actionUserId}:${row.created}:${row.actionType}`;
    const existing = eventMap.get(key);
    if (existing) {
      existing.push(row);
    } else {
      eventMap.set(key, [row]);
    }
  }

  const events: AssembledEvent[] = [];

  for (const [, groupRows] of eventMap) {
    // Sort by entity hierarchy: Tournament(0) < Match(1) < Game(2) < Score(3)
    groupRows.sort((a, b) => a.entityType - b.entityType);

    const topRow = groupRows[0]!;
    const isSystem = topRow.actionUserId === null;
    const normalizedChanges = camelizeChangesKeys(topRow.sampleChanges);
    const action = classifyAction(
      topRow.actionType,
      normalizedChanges,
      isSystem
    );

    // Determine if this is a cascade (multiple entity types)
    const entityTypes = new Set(groupRows.map((r) => r.entityType));
    const isCascade = entityTypes.size > 1;

    // Compute one-sublevel child count
    const childType = getImmediateChildType(topRow.entityType);
    let childAffectedCount = 0;
    if (childType !== null) {
      for (const r of groupRows) {
        if (r.entityType === childType) {
          childAffectedCount += r.entryCount;
        }
      }
    }

    events.push({
      action,
      actionUserId: topRow.actionUserId,
      created: topRow.created,
      isSystem,
      topEntityType: topRow.entityType,
      topEntityId: topRow.sampleEntityId,
      topEntityCount: topRow.entryCount,
      childEntityType: childType,
      childAffectedCount,
      isCascade,
      parentEntityId: topRow.parentEntityId,
      changedFields: extractChangedFields(normalizedChanges),
      sampleChanges: normalizedChanges,
    });
  }

  // --- Post-processing: aggregate system events ---
  // System events are processed individually per entity, each with a unique
  // timestamp. Re-group them by (parentEntityId, action, hourBucket) to
  // produce summary rows like "System pre-verified N matches in Tournament X".
  const systemEvents: AssembledEvent[] = [];
  const adminEvents: AssembledEvent[] = [];

  for (const event of events) {
    if (event.isSystem) {
      systemEvents.push(event);
    } else {
      adminEvents.push(event);
    }
  }

  const aggregatedSystem: AssembledEvent[] = [];
  if (systemEvents.length > 0) {
    const systemGroupMap = new Map<string, AssembledEvent[]>();
    for (const event of systemEvents) {
      const hourBucket = Math.floor(
        new Date(event.created).getTime() / 3600000
      );
      const key = `${event.parentEntityId}:${event.action}:${hourBucket}`;
      const existing = systemGroupMap.get(key);
      if (existing) {
        existing.push(event);
      } else {
        systemGroupMap.set(key, [event]);
      }
    }

    for (const [, group] of systemGroupMap) {
      if (group.length === 1) {
        aggregatedSystem.push(group[0]!);
        continue;
      }

      // Sort by timestamp descending to pick the latest as the display timestamp
      group.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );

      const latest = group[0]!;
      const earliest = group[group.length - 1]!;

      // Sum topEntityCount across all events in the group
      let totalCount = 0;
      for (const e of group) {
        totalCount += e.topEntityCount;
      }

      aggregatedSystem.push({
        ...latest,
        topEntityCount: totalCount,
        earliestCreated: earliest.created,
      });
    }
  }

  const allEvents = [...adminEvents, ...aggregatedSystem];

  // Sort by timestamp descending
  allEvents.sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  return allEvents;
}

/**
 * Build cascade child summary string for entity timeline display.
 * e.g., "also affected 85 of 118 matches"
 */
export function buildChildSummary(
  childType: AuditEntityType,
  affected: number,
  total: number | null
): string {
  const label =
    affected === 1
      ? entityTypeLabel(childType)
      : entityTypeLabelPlural(childType);

  if (total !== null && total !== affected) {
    return `also affected ${affected} of ${total} ${label}`;
  }
  return `also affected ${affected} ${label}`;
}

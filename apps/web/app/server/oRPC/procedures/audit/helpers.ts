import * as schema from '@otr/core/db/schema';
import { AuditEntityType } from '@otr/core/osu';
import type { AuditEntry, AuditTimelineItem } from '@/lib/orpc/schema/audit';

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
  ...arrays: AuditTimelineItem[][]
): AuditTimelineItem[] {
  const merged = arrays.flat();
  merged.sort((a, b) => {
    const dateA = new Date(a.data.created).getTime();
    const dateB = new Date(b.data.created).getTime();
    return dateB - dateA;
  });
  return merged;
}

/**
 * Merge-sort audit entries from multiple tables by created date descending.
 */
export function mergeAuditEntries(
  ...arrays: AuditEntry[][]
): AuditEntry[] {
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

/** Entity type slug for URL paths */
export function entityTypeToSlug(entityType: AuditEntityType): string {
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

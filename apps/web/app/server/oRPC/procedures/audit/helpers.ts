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

/** All audit tables in order matching AuditEntityType values */
export const ALL_AUDIT_TABLES = [
  { table: schema.tournamentAudits, entityType: AuditEntityType.Tournament },
  { table: schema.matchAudits, entityType: AuditEntityType.Match },
  { table: schema.gameAudits, entityType: AuditEntityType.Game },
  { table: schema.gameScoreAudits, entityType: AuditEntityType.Score },
] as const;

/**
 * Normalizes JSONB change keys from snake_case to camelCase.
 * The audit triggers store keys in snake_case, but historical data
 * was already camelized by a migration. This handles both cases.
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
    result[camelKey] = value;
  }
  return result;
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

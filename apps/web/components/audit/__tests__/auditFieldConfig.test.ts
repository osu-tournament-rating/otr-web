import { describe, expect, it } from 'bun:test';
import { getTableColumns } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { AuditEntityType } from '@otr/core/osu';

import { auditFieldConfig } from '../auditFieldConfig';

// Generated columns are recorded through the fields they derive from.
const EXCLUDED_AUDIT_FIELDS = new Set([
  'id',
  'updated',
  'searchVector',
  'matchRankVector',
]);

const sourceTables = {
  [AuditEntityType.Tournament]: schema.tournaments,
  [AuditEntityType.Match]: schema.matches,
  [AuditEntityType.Game]: schema.games,
  [AuditEntityType.Score]: schema.gameScores,
  [AuditEntityType.Beatmap]: schema.beatmaps,
} as const;

// Written by the beatmap admin procedure, not by a column-diffing trigger.
const SYNTHETIC_AUDIT_FIELDS: Partial<Record<AuditEntityType, string[]>> = {
  [AuditEntityType.Beatmap]: ['creators'],
};

describe('auditFieldConfig', () => {
  it('covers every automatically audited business field', () => {
    for (const [rawEntityType, table] of Object.entries(sourceTables)) {
      const entityType = Number(rawEntityType) as AuditEntityType;
      const schemaFields = [
        ...Object.keys(getTableColumns(table)).filter(
          (field) => !EXCLUDED_AUDIT_FIELDS.has(field)
        ),
        ...(SYNTHETIC_AUDIT_FIELDS[entityType] ?? []),
      ].sort();
      const configuredFields = Object.keys(auditFieldConfig[entityType]).sort();

      expect(configuredFields).toEqual(schemaFields);
    }
  });
});

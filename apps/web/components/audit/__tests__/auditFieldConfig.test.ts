import { describe, expect, it } from 'bun:test';
import { getTableColumns } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { AuditEntityType } from '@otr/core/osu';

import { auditFieldConfig } from '../auditFieldConfig';

const EXCLUDED_AUDIT_FIELDS = new Set(['id', 'updated', 'searchVector']);

const sourceTables = {
  [AuditEntityType.Tournament]: schema.tournaments,
  [AuditEntityType.Match]: schema.matches,
  [AuditEntityType.Game]: schema.games,
  [AuditEntityType.Score]: schema.gameScores,
} as const;

describe('auditFieldConfig', () => {
  it('covers every automatically audited business field', () => {
    for (const [rawEntityType, table] of Object.entries(sourceTables)) {
      const entityType = Number(rawEntityType) as AuditEntityType;
      const schemaFields = Object.keys(getTableColumns(table))
        .filter((field) => !EXCLUDED_AUDIT_FIELDS.has(field))
        .sort();
      const configuredFields = Object.keys(auditFieldConfig[entityType]).sort();

      expect(configuredFields).toEqual(schemaFields);
    }
  });
});

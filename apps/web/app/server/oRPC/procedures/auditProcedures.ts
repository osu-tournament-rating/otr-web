import { and, desc, eq, isNotNull, lt, sql, inArray } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { AuditEntityType, AuditActionType } from '@otr/core/osu';

import {
  EntityAuditInputSchema,
  AuditTimelineResponseSchema,
  AuditSearchInputSchema,
  CursorPaginationInputSchema,
  AuditDefaultViewResponseSchema,
  AuditAdminUsersResponseSchema,
  type AuditEntry,
  type AuditAdminNote,
  type AuditTimelineItem,
  type AuditGroupedEntry,
} from '@/lib/orpc/schema/audit';
import type { DatabaseClient } from '@/lib/db';

import { publicProcedure } from './base';
import {
  getAuditTable,
  getAdminNotesTable,
  ALL_AUDIT_TABLES,
  camelizeChangesKeys,
  mergeTimelineItems,
  mergeAuditEntries,
} from './audit/helpers';

type AuditRow = {
  id: number;
  created: string;
  referenceIdLock: number;
  referenceId: number | null;
  actionUserId: number | null;
  actionType: number;
  changes: unknown;
  userId: number | null;
  playerId: number | null;
  username: string | null;
};

function mapAuditRow(
  row: AuditRow,
  entityType: AuditEntityType
): AuditEntry {
  return {
    id: row.id,
    entityType,
    referenceIdLock: row.referenceIdLock,
    referenceId: row.referenceId,
    actionUserId: row.actionUserId,
    actionType: row.actionType as AuditActionType,
    changes: camelizeChangesKeys(
      row.changes as Record<string, unknown> | null
    ),
    created: row.created,
    actionUser: row.userId
      ? {
          id: row.userId,
          playerId: row.playerId,
          username: row.username,
        }
      : null,
  };
}

type AdminNoteRow = {
  id: number;
  note: string;
  created: string;
  updated: string | null;
  userId: number | null;
  playerId: number | null;
  username: string | null;
};

function mapAdminNoteRow(row: AdminNoteRow): AuditAdminNote {
  return {
    id: row.id,
    note: row.note,
    created: row.created,
    updated: row.updated,
    adminUser: row.userId
      ? {
          id: row.userId,
          playerId: row.playerId,
          username: row.username,
        }
      : null,
  };
}

async function queryAuditEntries(
  db: DatabaseClient,
  entityType: AuditEntityType,
  options: {
    referenceIdLock?: number;
    cursor?: number;
    limit: number;
    actionUserIdNotNull?: boolean;
    actionUserId?: number;
    actionTypes?: AuditActionType[];
    dateFrom?: string;
    dateTo?: string;
    fieldChanged?: string;
    entityId?: number;
    changeValue?: string;
    cursorTimestamp?: string;
  }
): Promise<AuditEntry[]> {
  const table = getAuditTable(entityType);

  const conditions = [];

  if (options.referenceIdLock !== undefined) {
    conditions.push(eq(table.referenceIdLock, options.referenceIdLock));
  }

  if (options.cursor !== undefined) {
    conditions.push(lt(table.id, options.cursor));
  }

  if (options.actionUserIdNotNull) {
    conditions.push(isNotNull(table.actionUserId));
  }

  if (options.actionUserId !== undefined) {
    conditions.push(eq(table.actionUserId, options.actionUserId));
  }

  if (options.actionTypes && options.actionTypes.length > 0) {
    conditions.push(inArray(table.actionType, options.actionTypes));
  }

  if (options.dateFrom) {
    conditions.push(
      sql`${table.created} >= ${options.dateFrom}::timestamptz`
    );
  }

  if (options.dateTo) {
    conditions.push(
      sql`${table.created} <= ${options.dateTo}::timestamptz`
    );
  }

  if (options.fieldChanged) {
    conditions.push(sql`${table.changes} ? ${options.fieldChanged}`);
  }

  if (options.entityId !== undefined) {
    conditions.push(eq(table.referenceIdLock, options.entityId));
  }

  if (options.changeValue && options.fieldChanged) {
    conditions.push(
      sql`${table.changes} @> ${JSON.stringify({
        [options.fieldChanged]: { newValue: tryParseJsonValue(options.changeValue) },
      })}::jsonb`
    );
  }

  if (options.cursorTimestamp) {
    conditions.push(
      sql`${table.created} < ${options.cursorTimestamp}::timestamptz`
    );
  }

  const rows = await db
    .select({
      id: table.id,
      created: table.created,
      referenceIdLock: table.referenceIdLock,
      referenceId: table.referenceId,
      actionUserId: table.actionUserId,
      actionType: table.actionType,
      changes: table.changes,
      userId: schema.users.id,
      playerId: schema.players.id,
      username: schema.players.username,
    })
    .from(table)
    .leftJoin(schema.users, eq(schema.users.id, table.actionUserId))
    .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(table.id))
    .limit(options.limit);

  return (rows as AuditRow[]).map((row) => mapAuditRow(row, entityType));
}

function tryParseJsonValue(value: string): unknown {
  // Try to parse as number
  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== '') return num;
  // Try to parse as boolean
  if (value === 'true') return true;
  if (value === 'false') return false;
  // Return as string
  return value;
}

// --- Procedure 1: Per-entity audit timeline ---

export const getEntityAuditTimeline = publicProcedure
  .input(EntityAuditInputSchema)
  .output(AuditTimelineResponseSchema)
  .route({
    summary: 'Get audit timeline for a specific entity',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/timeline',
  })
  .handler(async ({ input, context }) => {
    const { entityType, entityId, cursor, limit } = input;

    // Fetch audit entries
    const entries = await queryAuditEntries(context.db, entityType, {
      referenceIdLock: entityId,
      cursor,
      limit: limit + 1,
    });

    const hasMore = entries.length > limit;
    const trimmedEntries = hasMore ? entries.slice(0, limit) : entries;

    // Fetch admin notes for this entity
    const notesTable = getAdminNotesTable(entityType);
    const noteRows = await context.db
      .select({
        id: notesTable.id,
        note: notesTable.note,
        created: notesTable.created,
        updated: notesTable.updated,
        userId: schema.users.id,
        playerId: schema.players.id,
        username: schema.players.username,
      })
      .from(notesTable)
      .leftJoin(schema.users, eq(schema.users.id, notesTable.adminUserId))
      .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
      .where(eq(notesTable.referenceId, entityId))
      .orderBy(desc(notesTable.created));

    const auditItems: AuditTimelineItem[] = trimmedEntries.map((entry) => ({
      type: 'audit' as const,
      data: entry,
    }));

    const noteItems: AuditTimelineItem[] = (noteRows as AdminNoteRow[]).map(
      (row) => ({
        type: 'note' as const,
        data: mapAdminNoteRow(row),
      })
    );

    const items = mergeTimelineItems(auditItems, noteItems);

    const nextCursor =
      hasMore && trimmedEntries.length > 0
        ? trimmedEntries[trimmedEntries.length - 1].id
        : null;

    return { items, nextCursor, hasMore };
  });

// --- Procedure 2: Default audit activity view ---

export const getDefaultAuditActivity = publicProcedure
  .input(CursorPaginationInputSchema)
  .output(AuditDefaultViewResponseSchema)
  .route({
    summary: 'Get default audit activity (admin-initiated, grouped)',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/activity',
  })
  .handler(async ({ input, context }) => {
    const { cursor, limit } = input;
    const cursorTimestamp = cursor
      ? new Date(cursor).toISOString()
      : undefined;

    // Query each table for admin-initiated entries
    const allEntries = await Promise.all(
      ALL_AUDIT_TABLES.map(({ entityType }) =>
        queryAuditEntries(context.db, entityType, {
          actionUserIdNotNull: true,
          cursorTimestamp,
          limit: limit + 1,
        })
      )
    );

    // Merge and sort by created descending
    const merged = mergeAuditEntries(...allEntries);
    const trimmed = merged.slice(0, limit + 1);
    const hasMore = trimmed.length > limit;
    const final = hasMore ? trimmed.slice(0, limit) : trimmed;

    // Group entries by (actionUserId, entityType, changedFieldKeys, ~timestamp)
    const groups: AuditGroupedEntry[] = [];

    for (const entry of final) {
      const changedFields = entry.changes ? Object.keys(entry.changes).sort() : [];
      const changedFieldsKey = changedFields.join(',');
      const timestampBucket = Math.floor(
        new Date(entry.created).getTime() / 1000
      );

      const lastGroup = groups[groups.length - 1];
      const lastGroupTimestamp = lastGroup
        ? Math.floor(new Date(lastGroup.latestCreated).getTime() / 1000)
        : -1;

      if (
        lastGroup &&
        lastGroup.actionUserId === entry.actionUserId &&
        lastGroup.entityType === entry.entityType &&
        lastGroup.actionType === entry.actionType &&
        lastGroup.changedFields.join(',') === changedFieldsKey &&
        Math.abs(timestampBucket - lastGroupTimestamp) <= 1
      ) {
        lastGroup.entries.push(entry);
        lastGroup.count++;
      } else {
        groups.push({
          actionUserId: entry.actionUserId,
          actionUser: entry.actionUser,
          entityType: entry.entityType,
          actionType: entry.actionType,
          changedFields,
          entries: [entry],
          latestCreated: entry.created,
          count: 1,
        });
      }
    }

    const nextCursor =
      hasMore && final.length > 0
        ? String(new Date(final[final.length - 1].created).getTime())
        : null;

    return { groups, nextCursor, hasMore };
  });

// --- Procedure 3: Search audits ---

export const searchAudits = publicProcedure
  .input(AuditSearchInputSchema)
  .output(AuditTimelineResponseSchema)
  .route({
    summary: 'Search audit entries with filters',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/search',
  })
  .handler(async ({ input, context }) => {
    const {
      entityTypes,
      actionTypes,
      adminOnly,
      dateFrom,
      dateTo,
      adminUserId,
      fieldChanged,
      entityId,
      changeValue,
      cursor,
      limit,
    } = input;

    const targetEntityTypes =
      entityTypes && entityTypes.length > 0
        ? entityTypes
        : [
            AuditEntityType.Tournament,
            AuditEntityType.Match,
            AuditEntityType.Game,
            AuditEntityType.Score,
          ];

    const allEntries = await Promise.all(
      targetEntityTypes.map((entityType) =>
        queryAuditEntries(context.db, entityType, {
          cursor,
          limit: limit + 1,
          actionUserIdNotNull: adminOnly,
          actionUserId: adminUserId,
          actionTypes,
          dateFrom,
          dateTo,
          fieldChanged,
          entityId,
          changeValue,
        })
      )
    );

    const merged = mergeAuditEntries(...allEntries);
    const trimmed = merged.slice(0, limit + 1);
    const hasMore = trimmed.length > limit;
    const final = hasMore ? trimmed.slice(0, limit) : trimmed;

    const items: AuditTimelineItem[] = final.map((entry) => ({
      type: 'audit' as const,
      data: entry,
    }));

    const nextCursor =
      hasMore && final.length > 0 ? final[final.length - 1].id : null;

    return { items, nextCursor, hasMore };
  });

// --- Procedure 4: List admin users for autocomplete ---

export const listAuditAdminUsers = publicProcedure
  .output(AuditAdminUsersResponseSchema)
  .route({
    summary: 'List admin users who appear in audit logs',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/admin-users',
  })
  .handler(async ({ context }) => {
    // Query distinct action_user_ids across all audit tables
    const unionQuery = sql`
      SELECT DISTINCT action_user_id
      FROM (
        SELECT action_user_id FROM tournament_audits WHERE action_user_id IS NOT NULL
        UNION
        SELECT action_user_id FROM match_audits WHERE action_user_id IS NOT NULL
        UNION
        SELECT action_user_id FROM game_audits WHERE action_user_id IS NOT NULL
        UNION
        SELECT action_user_id FROM game_score_audits WHERE action_user_id IS NOT NULL
      ) sub
    `;

    const userIdsResult = await context.db.execute(unionQuery);
    const userIds = (userIdsResult.rows as { action_user_id: number }[]).map(
      (row) => row.action_user_id
    );

    if (userIds.length === 0) {
      return { users: [] };
    }

    const userRows = await context.db
      .select({
        userId: schema.users.id,
        playerId: schema.players.id,
        username: schema.players.username,
      })
      .from(schema.users)
      .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
      .where(inArray(schema.users.id, userIds));

    const users = userRows.map((row) => ({
      userId: row.userId,
      playerId: row.playerId,
      username: row.username,
    }));

    return { users };
  });

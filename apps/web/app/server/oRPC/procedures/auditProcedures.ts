import { and, desc, eq, isNotNull, lt, sql, inArray } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { AuditEntityType, AuditActionType } from '@otr/core/osu';

import {
  EntityAuditInputSchema,
  AuditTimelineResponseSchema,
  AuditSearchInputSchema,
  ActivityPaginationInputSchema,
  AuditActivityResponseSchema,
  GroupEntriesInputSchema,
  GroupEntriesResponseSchema,
  AuditAdminUsersResponseSchema,
  BatchChildCountsInputSchema,
  BatchChildCountsResponseSchema,
  BatchEntityIdsInputSchema,
  BatchEntityIdsResponseSchema,
  type AuditEntry,
  type AuditAdminNote,
  type AuditTimelineItem,
  type AuditGroupSummary,
} from '@/lib/orpc/schema/audit';
import type { DatabaseClient } from '@/lib/db';

import { publicProcedure } from './base';
import {
  getAuditTable,
  getAdminNotesTable,
  getParentEntityJoinInfo,
  LIGHT_AUDIT_TABLES,
  ALL_AUDIT_TABLES,
  camelizeChangesKeys,
  camelToSnake,
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
  osuId: number | null;
  username: string | null;
};

/** Fields in changes that contain user IDs requiring resolution */
const USER_ID_FIELDS = ['verifiedByUserId', 'submittedByUserId'];

type ReferencedUser = {
  id: number;
  playerId: number | null;
  osuId: number | null;
  username: string | null;
};

/** Extract all user IDs from changes that need resolution */
function extractUserIdsFromChanges(
  changes: Record<string, { originalValue?: unknown; newValue?: unknown }> | null
): number[] {
  if (!changes) return [];
  const ids: number[] = [];
  for (const field of USER_ID_FIELDS) {
    const change = changes[field];
    if (change) {
      if (typeof change.originalValue === 'number') ids.push(change.originalValue);
      if (typeof change.newValue === 'number') ids.push(change.newValue);
    }
  }
  return ids;
}

/** Resolve user IDs to user info */
async function resolveUserIds(
  db: DatabaseClient,
  userIds: number[]
): Promise<Map<number, ReferencedUser>> {
  if (userIds.length === 0) return new Map();

  const uniqueIds = [...new Set(userIds)];
  const rows = await db
    .select({
      userId: schema.users.id,
      playerId: schema.players.id,
      osuId: schema.players.osuId,
      username: schema.players.username,
    })
    .from(schema.users)
    .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
    .where(inArray(schema.users.id, uniqueIds));

  const map = new Map<number, ReferencedUser>();
  for (const row of rows) {
    map.set(row.userId, {
      id: row.userId,
      playerId: row.playerId,
      osuId: row.osuId,
      username: row.username,
    });
  }
  return map;
}

function mapAuditRow(
  row: AuditRow,
  entityType: AuditEntityType,
  userMap?: Map<number, ReferencedUser>
): AuditEntry {
  const changes = camelizeChangesKeys(
    row.changes as Record<string, unknown> | null
  );

  // Build referencedUsers for this entry from the shared user map
  let referencedUsers: Record<string, ReferencedUser> | undefined;
  if (userMap && changes) {
    const userIds = extractUserIdsFromChanges(
      changes as Record<string, { originalValue?: unknown; newValue?: unknown }>
    );
    if (userIds.length > 0) {
      referencedUsers = {};
      for (const id of userIds) {
        const user = userMap.get(id);
        if (user) {
          referencedUsers[String(id)] = user;
        }
      }
      // Only include if we found at least one user
      if (Object.keys(referencedUsers).length === 0) {
        referencedUsers = undefined;
      }
    }
  }

  return {
    id: row.id,
    entityType,
    referenceIdLock: row.referenceIdLock,
    referenceId: row.referenceId,
    actionUserId: row.actionUserId,
    actionType: row.actionType as AuditActionType,
    changes,
    created: row.created,
    actionUser: row.userId
      ? {
          id: row.userId,
          playerId: row.playerId,
          osuId: row.osuId,
          username: row.username,
        }
      : null,
    referencedUsers,
  };
}

type AdminNoteRow = {
  id: number;
  note: string;
  created: string;
  updated: string | null;
  userId: number | null;
  playerId: number | null;
  osuId: number | null;
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
          osuId: row.osuId,
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
    /** Array of field names to filter by (OR logic - match any) */
    fieldNames?: string[];
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

  if (options.fieldNames && options.fieldNames.length > 0) {
    // OR logic: match if ANY of the specified fields actually changed
    // DB stores keys in snake_case (triggers) or camelCase (historical), so check both
    const fieldConditions = options.fieldNames.map((name) => {
      const snakeName = camelToSnake(name);
      const sameCase = name === snakeName;
      const hasKey = sameCase
        ? sql`${table.changes} ? ${name}`
        : sql`(${table.changes} ? ${name} OR ${table.changes} ? ${snakeName})`;
      const valueCheck = sameCase
        ? sql`(
            COALESCE(${table.changes}->${name}->>'NewValue', ${table.changes}->${name}->>'newValue')
            IS DISTINCT FROM
            COALESCE(${table.changes}->${name}->>'OriginalValue', ${table.changes}->${name}->>'originalValue')
          )`
        : sql`(
            COALESCE(
              ${table.changes}->${name}->>'NewValue',
              ${table.changes}->${name}->>'newValue',
              ${table.changes}->${snakeName}->>'NewValue',
              ${table.changes}->${snakeName}->>'newValue'
            )
            IS DISTINCT FROM
            COALESCE(
              ${table.changes}->${name}->>'OriginalValue',
              ${table.changes}->${name}->>'originalValue',
              ${table.changes}->${snakeName}->>'OriginalValue',
              ${table.changes}->${snakeName}->>'originalValue'
            )
          )`;
      return sql`(${hasKey} AND ${valueCheck})`;
    });
    if (fieldConditions.length === 1) {
      conditions.push(fieldConditions[0]);
    } else {
      conditions.push(sql`(${sql.join(fieldConditions, sql` OR `)})`);
    }
  }

  if (options.entityId !== undefined) {
    conditions.push(eq(table.referenceIdLock, options.entityId));
  }

  if (options.changeValue && options.fieldNames && options.fieldNames.length === 1) {
    // changeValue only works when filtering by a single field
    conditions.push(
      sql`${table.changes} @> ${JSON.stringify({
        [options.fieldNames[0]]: { newValue: tryParseJsonValue(options.changeValue) },
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
      osuId: schema.players.osuId,
      username: schema.players.username,
    })
    .from(table)
    .leftJoin(schema.users, eq(schema.users.id, table.actionUserId))
    .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(table.id))
    .limit(options.limit);

  // Collect all user IDs from changes that need resolution
  const allUserIds: number[] = [];
  for (const row of rows) {
    const changes = camelizeChangesKeys(
      row.changes as Record<string, unknown> | null
    );
    const ids = extractUserIdsFromChanges(
      changes as Record<string, { originalValue?: unknown; newValue?: unknown }> | null
    );
    allUserIds.push(...ids);
  }

  // Resolve all user IDs in a single batch query
  const userMap = await resolveUserIds(db, allUserIds);

  return (rows as AuditRow[]).map((row) => mapAuditRow(row, entityType, userMap));
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
        osuId: schema.players.osuId,
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

// --- Procedure 2: Default audit activity view (SQL-level grouping) ---

type GroupingRow = {
  entity_type: number;
  action_user_id: number | null;
  action_type: number;
  changed_fields_key: string;
  parent_entity_id: number | null;
  count: number;
  latest_created: string;
  earliest_created: string;
  sample_changes: unknown;
  sample_reference_id_lock: number;
};

export const getDefaultAuditActivity = publicProcedure
  .input(ActivityPaginationInputSchema)
  .output(AuditActivityResponseSchema)
  .route({
    summary: 'Get default audit activity (admin-initiated, grouped)',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/activity',
  })
  .handler(async ({ input, context }) => {
    const {
      cursor,
      limit,
      entityTypes,
      actionTypes,
      adminOnly,
      dateFrom,
      dateTo,
      adminUserId,
      fieldsChanged,
      entityId,
    } = input;

    const hasFilters = !!(
      entityTypes || actionTypes || adminOnly || dateFrom || dateTo ||
      adminUserId !== undefined || fieldsChanged || entityId !== undefined
    );

    // Group field filters by entity type for per-table application
    const fieldsByEntityType = new Map<AuditEntityType, string[]>();
    if (fieldsChanged && fieldsChanged.length > 0) {
      for (const { entityType, fieldName } of fieldsChanged) {
        const existing = fieldsByEntityType.get(entityType) || [];
        fieldsByEntityType.set(entityType, [...existing, fieldName]);
      }
    }

    // Determine which tables to query:
    // - No filters: only lightweight tables (tournament + match)
    // - With filters: use entityTypes filter, or fieldsByEntityType, or all tables
    let tablesToQuery: { entityType: AuditEntityType }[];
    if (!hasFilters) {
      tablesToQuery = [...LIGHT_AUDIT_TABLES];
    } else if (fieldsByEntityType.size > 0) {
      // Only query entity types that have field filters
      let targetTypes = Array.from(fieldsByEntityType.keys());
      if (entityTypes && entityTypes.length > 0) {
        targetTypes = targetTypes.filter((et) => entityTypes.includes(et));
      }
      tablesToQuery = targetTypes.map((entityType) => ({ entityType }));
    } else if (entityTypes && entityTypes.length > 0) {
      tablesToQuery = entityTypes.map((entityType) => ({ entityType }));
    } else {
      tablesToQuery = [...ALL_AUDIT_TABLES];
    }

    // Build per-table grouping queries using SQL GROUP BY
    // Groups by parent tournament ID instead of time bucket
    const tableQueries = tablesToQuery.map(({ entityType }) => {
      const { fromClause, parentIdExpr } = getParentEntityJoinInfo(entityType);

      // Build WHERE conditions (prefixed with a. for audit table alias)
      const conditions: ReturnType<typeof sql>[] = [];

      // Default: only admin-initiated. With adminOnly=false explicitly, show all.
      if (!hasFilters || adminOnly !== false) {
        conditions.push(sql`a.action_user_id IS NOT NULL`);
      }

      if (adminUserId !== undefined) {
        conditions.push(sql`a.action_user_id = ${adminUserId}`);
      }

      if (cursor) {
        conditions.push(sql`a.created < ${cursor}::timestamptz`);
      }

      if (actionTypes && actionTypes.length > 0) {
        if (actionTypes.length === 1) {
          conditions.push(sql`a.action_type = ${actionTypes[0]}`);
        } else {
          conditions.push(sql`a.action_type IN (${sql.join(actionTypes.map(a => sql`${a}`), sql`, `)})`);
        }
      }

      if (dateFrom) {
        conditions.push(sql`a.created >= ${dateFrom}::timestamptz`);
      }

      if (dateTo) {
        conditions.push(sql`a.created <= ${dateTo}::timestamptz`);
      }

      if (entityId !== undefined) {
        conditions.push(sql`a.reference_id_lock = ${entityId}`);
      }

      // Field name filters (OR logic within entity type)
      // DB stores keys in snake_case (triggers) or camelCase (historical), so check both
      const entityFieldNames = fieldsByEntityType.get(entityType);
      if (entityFieldNames && entityFieldNames.length > 0) {
        const fieldConditions = entityFieldNames.map((name) => {
          const snakeName = camelToSnake(name);
          const hasKey = name === snakeName
            ? sql`a.changes ? ${name}`
            : sql`(a.changes ? ${name} OR a.changes ? ${snakeName})`;
          const valueCheck = name === snakeName
            ? sql`(
                COALESCE(a.changes->${sql.raw(`'${name}'`)}->>'NewValue', a.changes->${sql.raw(`'${name}'`)}->>'newValue')
                IS DISTINCT FROM
                COALESCE(a.changes->${sql.raw(`'${name}'`)}->>'OriginalValue', a.changes->${sql.raw(`'${name}'`)}->>'originalValue')
              )`
            : sql`(
                COALESCE(
                  a.changes->${sql.raw(`'${name}'`)}->>'NewValue',
                  a.changes->${sql.raw(`'${name}'`)}->>'newValue',
                  a.changes->${sql.raw(`'${snakeName}'`)}->>'NewValue',
                  a.changes->${sql.raw(`'${snakeName}'`)}->>'newValue'
                )
                IS DISTINCT FROM
                COALESCE(
                  a.changes->${sql.raw(`'${name}'`)}->>'OriginalValue',
                  a.changes->${sql.raw(`'${name}'`)}->>'originalValue',
                  a.changes->${sql.raw(`'${snakeName}'`)}->>'OriginalValue',
                  a.changes->${sql.raw(`'${snakeName}'`)}->>'originalValue'
                )
              )`;
          return sql`(${hasKey} AND ${valueCheck})`;
        });
        if (fieldConditions.length === 1) {
          conditions.push(fieldConditions[0]);
        } else {
          conditions.push(sql`(${sql.join(fieldConditions, sql` OR `)})`);
        }
      }

      const whereClause = conditions.length > 0
        ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
        : sql``;

      return sql`
        SELECT
          ${entityType}::int AS entity_type,
          a.action_user_id,
          a.action_type,
          COALESCE(
            (SELECT string_agg(k, ',' ORDER BY k)
             FROM jsonb_object_keys(COALESCE(a.changes, '{}'::jsonb)) AS k),
            ''
          ) AS changed_fields_key,
          ${sql.raw(parentIdExpr)} AS parent_entity_id,
          COUNT(*)::int AS count,
          MAX(a.created) AS latest_created,
          MIN(a.created) AS earliest_created,
          (array_agg(a.changes ORDER BY a.id DESC))[1] AS sample_changes,
          (array_agg(a.reference_id_lock ORDER BY a.id DESC))[1] AS sample_reference_id_lock
        FROM ${sql.raw(fromClause)}
        ${whereClause}
        GROUP BY a.action_user_id, a.action_type, changed_fields_key, parent_entity_id
      `;
    });

    const query = sql`
      SELECT * FROM (
        ${sql.join(tableQueries, sql` UNION ALL `)}
      ) combined
      ORDER BY latest_created DESC
      LIMIT ${limit + 1}
    `;

    const result = await context.db.execute(query);
    const rows = result.rows as GroupingRow[];

    const hasMore = rows.length > limit;
    const trimmedRows = hasMore ? rows.slice(0, limit) : rows;

    // Resolve action user info for all unique action_user_ids
    const actionUserIds = [
      ...new Set(
        trimmedRows
          .map((r) => r.action_user_id)
          .filter((id): id is number => id !== null)
      ),
    ];

    const userMap =
      actionUserIds.length > 0
        ? await resolveActionUsers(context.db, actionUserIds)
        : new Map<number, ReferencedUser>();

    // Resolve tournament names for ALL groups using parent_entity_id
    const tournamentIds = [
      ...new Set(
        trimmedRows
          .map((r) => r.parent_entity_id)
          .filter((id): id is number => id !== null)
      ),
    ];

    const tournamentNameMap =
      tournamentIds.length > 0
        ? await resolveTournamentNames(context.db, tournamentIds)
        : new Map<number, string>();

    // Map rows to AuditGroupSummary
    const groups: AuditGroupSummary[] = trimmedRows.map((row) => {
      const sampleChanges = camelizeChangesKeys(
        row.sample_changes as Record<string, unknown> | null
      );
      const changedFields = sampleChanges
        ? Object.keys(sampleChanges).sort()
        : [];
      const user = row.action_user_id
        ? userMap.get(row.action_user_id)
        : null;

      return {
        actionUserId: row.action_user_id,
        actionUser: user
          ? {
              id: user.id,
              playerId: user.playerId,
              osuId: user.osuId,
              username: user.username,
            }
          : null,
        entityType: row.entity_type as AuditEntityType,
        actionType: row.action_type as AuditActionType,
        changedFields,
        count: row.count,
        latestCreated: row.latest_created,
        earliestCreated: row.earliest_created,
        sampleChanges,
        sampleReferenceIdLock: row.sample_reference_id_lock,
        changedFieldsKey: row.changed_fields_key,
        parentEntityId: row.parent_entity_id,
        tournamentName: row.parent_entity_id
          ? tournamentNameMap.get(row.parent_entity_id) ?? null
          : null,
      };
    });

    const nextCursor =
      hasMore && trimmedRows.length > 0
        ? trimmedRows[trimmedRows.length - 1].latest_created
        : null;

    return { groups, nextCursor, hasMore };
  });

/** Resolve action user IDs to user info (id, playerId, osuId, username) */
async function resolveActionUsers(
  db: DatabaseClient,
  userIds: number[]
): Promise<Map<number, ReferencedUser>> {
  const rows = await db
    .select({
      userId: schema.users.id,
      playerId: schema.players.id,
      osuId: schema.players.osuId,
      username: schema.players.username,
    })
    .from(schema.users)
    .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
    .where(inArray(schema.users.id, userIds));

  const map = new Map<number, ReferencedUser>();
  for (const row of rows) {
    map.set(row.userId, {
      id: row.userId,
      playerId: row.playerId,
      osuId: row.osuId,
      username: row.username,
    });
  }
  return map;
}

/** Resolve entity IDs to names (tournaments and matches have name fields) */
async function resolveEntityNames(
  db: DatabaseClient,
  entityType: AuditEntityType,
  entityIds: number[]
): Promise<Map<number, string>> {
  if (entityIds.length === 0) return new Map();

  if (entityType === AuditEntityType.Tournament) {
    return resolveTournamentNames(db, entityIds);
  }

  if (entityType === AuditEntityType.Match) {
    const rows = await db
      .select({ id: schema.matches.id, name: schema.matches.name })
      .from(schema.matches)
      .where(inArray(schema.matches.id, entityIds));
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  // Games and scores don't have name fields
  return new Map();
}

/** Resolve tournament IDs to tournament names */
async function resolveTournamentNames(
  db: DatabaseClient,
  tournamentIds: number[]
): Promise<Map<number, string>> {
  const rows = await db
    .select({
      id: schema.tournaments.id,
      name: schema.tournaments.name,
    })
    .from(schema.tournaments)
    .where(inArray(schema.tournaments.id, tournamentIds));

  const map = new Map<number, string>();
  for (const row of rows) {
    map.set(row.id, row.name);
  }
  return map;
}

// --- Procedure 2b: Lazy-load entries within a group ---

export const getGroupEntries = publicProcedure
  .input(GroupEntriesInputSchema)
  .output(GroupEntriesResponseSchema)
  .route({
    summary: 'Get individual entries for an audit group',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/activity-entries',
  })
  .handler(async ({ input, context }) => {
    const {
      entityType,
      actionUserId,
      actionType,
      parentEntityId,
      changedFieldsKey,
      cursor,
      limit,
    } = input;

    const { fromClause, parentIdExpr } = getParentEntityJoinInfo(entityType);

    // Build conditions to match the exact grouping
    const conditions = [
      actionUserId !== null
        ? sql`a.action_user_id = ${actionUserId}`
        : sql`a.action_user_id IS NULL`,
      sql`a.action_type = ${actionType}`,
      parentEntityId !== null
        ? sql`${sql.raw(parentIdExpr)} = ${parentEntityId}`
        : sql`${sql.raw(parentIdExpr)} IS NULL`,
      sql`COALESCE(
        (SELECT string_agg(k, ',' ORDER BY k)
         FROM jsonb_object_keys(COALESCE(a.changes, '{}'::jsonb)) AS k),
        ''
      ) = ${changedFieldsKey}`,
    ];

    if (cursor !== undefined) {
      conditions.push(sql`a.id < ${cursor}`);
    }

    const query = sql`
      SELECT
        a.id, a.created, a.reference_id_lock, a.reference_id,
        a.action_user_id, a.action_type, a.changes
      FROM ${sql.raw(fromClause)}
      WHERE ${sql.join(conditions, sql` AND `)}
      ORDER BY a.id DESC
      LIMIT ${limit + 1}
    `;

    const result = await context.db.execute(query);
    const rows = result.rows as {
      id: number;
      created: string;
      reference_id_lock: number;
      reference_id: number | null;
      action_user_id: number | null;
      action_type: number;
      changes: unknown;
    }[];

    const hasMore = rows.length > limit;
    const trimmedRows = hasMore ? rows.slice(0, limit) : rows;

    // Resolve action users
    const actionUserIds = [
      ...new Set(
        trimmedRows
          .map((r) => r.action_user_id)
          .filter((id): id is number => id !== null)
      ),
    ];
    const userMap =
      actionUserIds.length > 0
        ? await resolveActionUsers(context.db, actionUserIds)
        : new Map<number, ReferencedUser>();

    // Collect referenced user IDs from changes for resolution
    const allRefUserIds: number[] = [];
    const normalizedChanges: (Record<string, unknown> | null)[] = [];
    for (const row of trimmedRows) {
      const changes = camelizeChangesKeys(
        row.changes as Record<string, unknown> | null
      );
      normalizedChanges.push(changes);
      const ids = extractUserIdsFromChanges(
        changes as Record<
          string,
          { originalValue?: unknown; newValue?: unknown }
        > | null
      );
      allRefUserIds.push(...ids);
    }
    const refUserMap = await resolveUserIds(context.db, allRefUserIds);

    // Resolve entity names for tournaments and matches
    const entityIds = [...new Set(trimmedRows.map((r) => r.reference_id_lock))];
    const entityNameMap = await resolveEntityNames(context.db, entityType, entityIds);

    const entries: AuditEntry[] = trimmedRows.map((row, i) => {
      const changes = normalizedChanges[i];
      const actionUser = row.action_user_id
        ? userMap.get(row.action_user_id)
        : null;

      // Build referencedUsers
      let referencedUsers: Record<string, ReferencedUser> | undefined;
      if (changes) {
        const userIds = extractUserIdsFromChanges(
          changes as Record<
            string,
            { originalValue?: unknown; newValue?: unknown }
          >
        );
        if (userIds.length > 0) {
          referencedUsers = {};
          for (const id of userIds) {
            const user = refUserMap.get(id);
            if (user) {
              referencedUsers[String(id)] = user;
            }
          }
          if (Object.keys(referencedUsers).length === 0) {
            referencedUsers = undefined;
          }
        }
      }

      return {
        id: row.id,
        entityType,
        referenceIdLock: row.reference_id_lock,
        referenceId: row.reference_id,
        actionUserId: row.action_user_id,
        actionType: row.action_type as AuditActionType,
        changes,
        created: row.created,
        actionUser: actionUser
          ? {
              id: actionUser.id,
              playerId: actionUser.playerId,
              osuId: actionUser.osuId,
              username: actionUser.username,
            }
          : null,
        referencedUsers,
        entityName: entityNameMap.get(row.reference_id_lock) ?? null,
      };
    });

    const nextCursor =
      hasMore && trimmedRows.length > 0
        ? trimmedRows[trimmedRows.length - 1].id
        : null;

    return { entries, nextCursor, hasMore };
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
      fieldsChanged,
      entityId,
      changeValue,
      cursor,
      limit,
    } = input;

    // Group field filters by entity type
    const fieldsByEntityType = new Map<AuditEntityType, string[]>();
    if (fieldsChanged && fieldsChanged.length > 0) {
      for (const { entityType, fieldName } of fieldsChanged) {
        const existing = fieldsByEntityType.get(entityType) || [];
        fieldsByEntityType.set(entityType, [...existing, fieldName]);
      }
    }

    // Determine which entity types to query:
    // - If fieldsChanged is set, only query entity types that have field filters
    // - Otherwise, use entityTypes filter or default to all
    let targetEntityTypes: AuditEntityType[];
    if (fieldsByEntityType.size > 0) {
      // Only query entity types that have field filters
      targetEntityTypes = Array.from(fieldsByEntityType.keys());
      // If entityTypes filter is also set, intersect them
      if (entityTypes && entityTypes.length > 0) {
        targetEntityTypes = targetEntityTypes.filter((et) =>
          entityTypes.includes(et)
        );
      }
    } else {
      targetEntityTypes =
        entityTypes && entityTypes.length > 0
          ? entityTypes
          : [
              AuditEntityType.Tournament,
              AuditEntityType.Match,
              AuditEntityType.Game,
              AuditEntityType.Score,
            ];
    }

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
          fieldNames: fieldsByEntityType.get(entityType),
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
        osuId: schema.players.osuId,
        username: schema.players.username,
      })
      .from(schema.users)
      .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
      .where(inArray(schema.users.id, userIds));

    const users = userRows.map((row) => ({
      userId: row.userId,
      playerId: row.playerId,
      osuId: row.osuId,
      username: row.username,
    }));

    return { users };
  });

// --- Procedure 5: Get parent matchId for game/score entities ---

import { z } from 'zod';

const EntityParentInputSchema = z.object({
  entityType: z.nativeEnum(AuditEntityType),
  entityId: z.number().int().positive(),
});

const EntityParentOutputSchema = z.object({
  matchId: z.number().int().nullable(),
});

export const getEntityParentMatchId = publicProcedure
  .input(EntityParentInputSchema)
  .output(EntityParentOutputSchema)
  .route({
    summary: 'Get parent matchId for a game or score entity',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/entity-parent',
  })
  .handler(async ({ input, context }) => {
    const { entityType, entityId } = input;

    if (entityType === AuditEntityType.Game) {
      // Game -> matchId directly
      const game = await context.db
        .select({ matchId: schema.games.matchId })
        .from(schema.games)
        .where(eq(schema.games.id, entityId))
        .limit(1);

      return { matchId: game[0]?.matchId ?? null };
    }

    if (entityType === AuditEntityType.Score) {
      // Score -> gameId -> matchId
      const result = await context.db
        .select({ matchId: schema.games.matchId })
        .from(schema.gameScores)
        .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
        .where(eq(schema.gameScores.id, entityId))
        .limit(1);

      return { matchId: result[0]?.matchId ?? null };
    }

    // Tournament and Match don't need parent lookup
    return { matchId: null };
  });

// --- Procedure 6: Lazy-load child entity counts for a batch operation ---

export const getBatchChildCounts = publicProcedure
  .input(BatchChildCountsInputSchema)
  .output(BatchChildCountsResponseSchema)
  .route({
    summary: 'Get child entity counts for a batch operation (lazy load)',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/batch-child-counts',
  })
  .handler(async ({ input, context }) => {
    const { actionUserId, parentEntityId, timeFrom, timeTo, entityTypes } = input;

    const countQueries = entityTypes.map((entityType) => {
      const { fromClause, parentIdExpr } = getParentEntityJoinInfo(entityType);

      const conditions = [
        actionUserId !== null
          ? sql`a.action_user_id = ${actionUserId}`
          : sql`a.action_user_id IS NULL`,
      ];

      if (parentEntityId !== null) {
        conditions.push(sql`${sql.raw(parentIdExpr)} = ${parentEntityId}`);
      }
      if (timeFrom) {
        conditions.push(sql`a.created >= ${timeFrom}::timestamptz`);
      }
      if (timeTo) {
        conditions.push(sql`a.created <= ${timeTo}::timestamptz`);
      }

      return sql`
        SELECT
          ${entityType}::int AS entity_type,
          COUNT(*)::int AS count
        FROM ${sql.raw(fromClause)}
        WHERE ${sql.join(conditions, sql` AND `)}
      `;
    });

    const query = sql`
      SELECT * FROM (
        ${sql.join(countQueries, sql` UNION ALL `)}
      ) counts
    `;

    const result = await context.db.execute(query);
    const rows = result.rows as { entity_type: number; count: number }[];

    return {
      counts: rows.map((row) => ({
        entityType: row.entity_type as AuditEntityType,
        count: row.count,
      })),
    };
  });

export const getBatchEntityIds = publicProcedure
  .input(BatchEntityIdsInputSchema)
  .output(BatchEntityIdsResponseSchema)
  .route({
    summary: 'Get distinct entity IDs for a batch operation',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/batch-entity-ids',
  })
  .handler(async ({ input, context }) => {
    const { actionUserId, parentEntityId, timeFrom, timeTo, entityTypes } = input;

    const results = await Promise.all(
      entityTypes.map((entityType) => {
        const { fromClause, parentIdExpr } = getParentEntityJoinInfo(entityType);

        const conditions = [
          actionUserId !== null
            ? sql`a.action_user_id = ${actionUserId}`
            : sql`a.action_user_id IS NULL`,
        ];

        if (parentEntityId !== null) {
          conditions.push(sql`${sql.raw(parentIdExpr)} = ${parentEntityId}`);
        }
        if (timeFrom) {
          conditions.push(sql`a.created >= ${timeFrom}::timestamptz`);
        }
        if (timeTo) {
          conditions.push(sql`a.created <= ${timeTo}::timestamptz`);
        }

        return context.db.execute(sql`
          SELECT DISTINCT a.reference_id_lock AS id
          FROM ${sql.raw(fromClause)}
          WHERE ${sql.join(conditions, sql` AND `)}
          ORDER BY id
          LIMIT 500
        `);
      })
    );

    // Resolve entity names for tournaments and matches
    const entitiesWithIds = entityTypes.map((entityType, i) => ({
      entityType,
      ids: (results[i].rows as { id: number }[]).map((r) => r.id),
    }));

    const entities = await Promise.all(
      entitiesWithIds.map(async ({ entityType, ids }) => {
        if (ids.length === 0) return { entityType, ids, items: [] };

        let nameMap = new Map<number, string | null>();
        if (entityType === AuditEntityType.Tournament && ids.length > 0) {
          const rows = await context.db
            .select({ id: schema.tournaments.id, name: schema.tournaments.name })
            .from(schema.tournaments)
            .where(inArray(schema.tournaments.id, ids));
          nameMap = new Map(rows.map((r) => [r.id, r.name]));
        } else if (entityType === AuditEntityType.Match && ids.length > 0) {
          const rows = await context.db
            .select({ id: schema.matches.id, name: schema.matches.name })
            .from(schema.matches)
            .where(inArray(schema.matches.id, ids));
          nameMap = new Map(rows.map((r) => [r.id, r.name]));
        }

        return {
          entityType,
          ids,
          items: ids.map((id) => ({
            id,
            name: nameMap.get(id) ?? null,
          })),
        };
      })
    );

    return { entities };
  });
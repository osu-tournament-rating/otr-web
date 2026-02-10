import { and, desc, eq, isNotNull, lt, sql, inArray } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { AuditEntityType, AuditActionType } from '@otr/core/osu';

import {
  EntityAuditInputSchema,
  EntityTimelineResponseSchema,
  AuditSearchInputSchema,
  AuditTimelineResponseSchema,
  EventFeedInputSchema,
  EventFeedResponseSchema,
  EventDetailsInputSchema,
  EventDetailsResponseSchema,
  AuditAdminUsersResponseSchema,
  type AuditEntry,
  type AuditAdminNote,
  type AuditEvent,
  type EntityTimelineItem,
  type EntityTimelineEvent,
} from '@/lib/orpc/schema/audit';
import type { DatabaseClient } from '@/lib/db';

import { publicProcedure } from './base';
import {
  getAuditTable,
  getAdminNotesTable,
  getParentEntityJoinInfo,
  getTableNameString,
  ALL_AUDIT_TABLES,
  LIGHT_AUDIT_TABLES,
  camelizeChangesKeys,
  camelToSnake,
  mergeTimelineItems,
  mergeAuditEntries,
  assembleEvents,
  classifyAction,
  getImmediateChildType,
  buildChildSummary,
  type GroupedAuditRow,
} from './audit/helpers';

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Raw row type for the event feed grouped SQL query
// ---------------------------------------------------------------------------

type GroupedEventRow = {
  entity_type: number;
  action_user_id: number | null;
  created: string;
  action_type: number;
  parent_entity_id: number | null;
  count: number;
  sample_changes: unknown;
  sample_entity_id: number;
};

// ---------------------------------------------------------------------------
// Raw row type for cascade sibling detection
// ---------------------------------------------------------------------------

type CascadeSiblingRow = {
  entity_type: number;
  cnt: number;
  sample_id: number;
  sample_changes: unknown;
};

// ---------------------------------------------------------------------------
// Procedure 1: Per-entity audit timeline (enhanced with cascade context)
// ---------------------------------------------------------------------------

export const getEntityAuditTimeline = publicProcedure
  .input(EntityAuditInputSchema)
  .output(EntityTimelineResponseSchema)
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

    // Detect cascade context for entries that changed verificationStatus
    const cascadePairs = new Map<
      string,
      { actionUserId: number | null; created: string }
    >();
    for (const entry of trimmedEntries) {
      if (!entry.changes) continue;
      const changes = entry.changes as Record<string, unknown>;
      if (changes.verificationStatus || changes.verification_status) {
        const key = `${entry.actionUserId}:${entry.created}`;
        if (!cascadePairs.has(key)) {
          cascadePairs.set(key, {
            actionUserId: entry.actionUserId,
            created: entry.created,
          });
        }
      }
    }

    // For each cascade pair, query sibling entries across other audit tables
    const cascadeContextMap = new Map<
      string,
      {
        topEntityType: AuditEntityType;
        topEntityId: number;
        topEntityName: string | null;
        action: ReturnType<typeof classifyAction>;
        childSummary: string | null;
      }
    >();

    if (cascadePairs.size > 0) {
      // Get the parent tournament ID for the current entity
      const { fromClause, parentIdExpr } = getParentEntityJoinInfo(entityType);

      // Resolve parent tournament ID for this entity
      const parentResult = await context.db.execute(sql`
        SELECT ${sql.raw(parentIdExpr)} AS parent_id
        FROM ${sql.raw(fromClause)}
        WHERE a.reference_id_lock = ${entityId}
        LIMIT 1
      `);
      const parentTournamentId = (parentResult.rows[0] as { parent_id: number | null } | undefined)?.parent_id ?? null;

      if (parentTournamentId !== null) {
        for (const [key, { actionUserId, created }] of cascadePairs) {
          // Query all audit tables for sibling entries with same (actionUserId, created)
          // that share the same parent tournament
          const siblingQueries = ALL_AUDIT_TABLES.map(({ entityType: et }) => {
            const info = getParentEntityJoinInfo(et);
            const userCondition = actionUserId !== null
              ? sql`a.action_user_id = ${actionUserId}`
              : sql`a.action_user_id IS NULL`;
            return sql`
              SELECT
                ${et}::int AS entity_type,
                COUNT(*)::int AS cnt,
                (array_agg(a.reference_id_lock ORDER BY a.id DESC))[1] AS sample_id,
                (array_agg(a.changes ORDER BY a.id DESC))[1] AS sample_changes
              FROM ${sql.raw(info.fromClause)}
              WHERE ${userCondition}
                AND a.created = ${created}::timestamptz
                AND ${sql.raw(info.parentIdExpr)} = ${parentTournamentId}
              GROUP BY entity_type
            `;
          });

          const siblingResult = await context.db.execute(
            sql`${sql.join(siblingQueries, sql` UNION ALL `)}`
          );
          const siblingRows = siblingResult.rows as CascadeSiblingRow[];

          if (siblingRows.length <= 1) {
            // Not a cascade - only the current entity type has entries
            continue;
          }

          // Sort by entity hierarchy (lowest enum = highest in hierarchy)
          siblingRows.sort((a, b) => a.entity_type - b.entity_type);

          const topRow = siblingRows[0]!;
          const topEntityType = topRow.entity_type as AuditEntityType;
          const topEntityId = topRow.sample_id;
          const isSystem = actionUserId === null;
          const topChanges = camelizeChangesKeys(
            topRow.sample_changes as Record<string, unknown> | null
          );
          const action = classifyAction(
            AuditActionType.Updated,
            topChanges,
            isSystem
          );

          // Determine child type and affected count
          const childType = getImmediateChildType(topEntityType);
          let childAffectedCount = 0;
          if (childType !== null) {
            for (const sr of siblingRows) {
              if (sr.entity_type === childType) {
                childAffectedCount = sr.cnt;
              }
            }
          }

          // Resolve total child count from entity tables for verification events
          let totalChildCount: number | null = null;
          if (childType !== null && childAffectedCount > 0) {
            if (topEntityType === AuditEntityType.Tournament && childType === AuditEntityType.Match) {
              const countResult = await context.db.execute(sql`
                SELECT COUNT(*)::int AS cnt FROM matches WHERE tournament_id = ${topEntityId}
              `);
              totalChildCount = (countResult.rows[0] as { cnt: number } | undefined)?.cnt ?? null;
            } else if (topEntityType === AuditEntityType.Match && childType === AuditEntityType.Game) {
              const countResult = await context.db.execute(sql`
                SELECT COUNT(*)::int AS cnt FROM games WHERE match_id = ${topEntityId}
              `);
              totalChildCount = (countResult.rows[0] as { cnt: number } | undefined)?.cnt ?? null;
            } else if (topEntityType === AuditEntityType.Game && childType === AuditEntityType.Score) {
              const countResult = await context.db.execute(sql`
                SELECT COUNT(*)::int AS cnt FROM game_scores WHERE game_id = ${topEntityId}
              `);
              totalChildCount = (countResult.rows[0] as { cnt: number } | undefined)?.cnt ?? null;
            }
          }

          // Resolve top entity name
          const topNameMap = await resolveEntityNames(context.db, topEntityType, [topEntityId]);
          const topEntityName = topNameMap.get(topEntityId) ?? null;

          const childSummary =
            childType !== null && childAffectedCount > 0
              ? buildChildSummary(childType, childAffectedCount, totalChildCount)
              : null;

          cascadeContextMap.set(key, {
            topEntityType,
            topEntityId,
            topEntityName,
            action,
            childSummary,
          });
        }
      }
    }

    // Map entries to EntityTimelineEvent (with cascadeContext or null)
    const auditItems: EntityTimelineItem[] = trimmedEntries.map((entry) => {
      const key = `${entry.actionUserId}:${entry.created}`;
      const ctx = cascadeContextMap.get(key) ?? null;

      return {
        type: 'audit' as const,
        data: {
          entry,
          cascadeContext: ctx,
        } satisfies EntityTimelineEvent,
      };
    });

    const noteItems: EntityTimelineItem[] = (noteRows as AdminNoteRow[]).map(
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

// ---------------------------------------------------------------------------
// Procedure 2: Audit event feed (grouped by transaction)
// ---------------------------------------------------------------------------

export const getAuditEventFeed = publicProcedure
  .input(EventFeedInputSchema)
  .output(EventFeedResponseSchema)
  .route({
    summary: 'Get audit event feed (grouped by transaction)',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/events',
  })
  .handler(async ({ input, context }) => {
    const {
      cursor,
      limit,
      entityTypes,
      actionTypes,
      dateFrom,
      dateTo,
      adminUserId,
      fieldsChanged,
      entityId,
      showSystem,
    } = input;

    // Group field filters by entity type for per-table application
    const fieldsByEntityType = new Map<AuditEntityType, string[]>();
    if (fieldsChanged && fieldsChanged.length > 0) {
      for (const { entityType, fieldName } of fieldsChanged) {
        const existing = fieldsByEntityType.get(entityType) || [];
        fieldsByEntityType.set(entityType, [...existing, fieldName]);
      }
    }

    // Determine which tables to query
    let tablesToQuery: { entityType: AuditEntityType }[];
    if (fieldsByEntityType.size > 0) {
      let targetTypes = Array.from(fieldsByEntityType.keys());
      if (entityTypes && entityTypes.length > 0) {
        targetTypes = targetTypes.filter((et) => entityTypes.includes(et));
      }
      tablesToQuery = targetTypes.map((entityType) => ({ entityType }));
    } else if (entityTypes && entityTypes.length > 0) {
      tablesToQuery = entityTypes.map((entityType) => ({ entityType }));
    } else {
      // Default: only tournament + match tables for performance.
      // Game/score events appear when explicitly filtered by entity type.
      tablesToQuery = [...LIGHT_AUDIT_TABLES];
    }

    // Build per-table grouping queries with GROUP BY (actionUserId, created, actionType, parentEntityId)
    const tableQueries = tablesToQuery.map(({ entityType }) => {
      const { fromClause, parentIdExpr } = getParentEntityJoinInfo(entityType);

      const conditions: ReturnType<typeof sql>[] = [];

      // Default: only admin-initiated, unless showSystem is true
      if (!showSystem) {
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
          conditions.push(sql`a.action_type IN (${sql.join(actionTypes.map((a) => sql`${a}`), sql`, `)})`);
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
          a.created,
          a.action_type,
          ${sql.raw(parentIdExpr)} AS parent_entity_id,
          COUNT(*)::int AS count,
          (array_agg(a.changes ORDER BY a.id DESC))[1] AS sample_changes,
          (array_agg(a.reference_id_lock ORDER BY a.id DESC))[1] AS sample_entity_id
        FROM ${sql.raw(fromClause)}
        ${whereClause}
        GROUP BY a.action_user_id, a.created, a.action_type, parent_entity_id
      `;
    });

    const query = sql`
      SELECT * FROM (
        ${sql.join(tableQueries, sql` UNION ALL `)}
      ) combined
      ORDER BY created DESC
      LIMIT ${limit + 1}
    `;

    const result = await context.db.execute(query);
    const rows = result.rows as GroupedEventRow[];

    const hasMore = rows.length > limit;
    const trimmedRows = hasMore ? rows.slice(0, limit) : rows;

    // Convert raw rows to GroupedAuditRow for assembleEvents
    const groupedRows: GroupedAuditRow[] = trimmedRows.map((row) => ({
      actionUserId: row.action_user_id,
      created: row.created,
      actionType: row.action_type as AuditActionType,
      entityType: row.entity_type as AuditEntityType,
      parentEntityId: row.parent_entity_id,
      entryCount: row.count,
      sampleChanges: row.sample_changes as Record<string, unknown> | null,
      sampleEntityId: row.sample_entity_id,
    }));

    // Assemble events (merges by actionUserId + created for cascade detection)
    const assembledEvents = assembleEvents(groupedRows);

    // --- Enrich events ---

    // 1. Resolve action users (batch)
    const actionUserIds = [
      ...new Set(
        assembledEvents
          .map((e) => e.actionUserId)
          .filter((id): id is number => id !== null)
      ),
    ];
    const userMap =
      actionUserIds.length > 0
        ? await resolveActionUsers(context.db, actionUserIds)
        : new Map<number, ReferencedUser>();

    // 2. Resolve tournament names (batch) from parentEntityIds
    const parentTournamentIds = [
      ...new Set(
        assembledEvents
          .map((e) => e.parentEntityId)
          .filter((id): id is number => id !== null)
      ),
    ];
    const tournamentNameMap =
      parentTournamentIds.length > 0
        ? await resolveTournamentNames(context.db, parentTournamentIds)
        : new Map<number, string>();

    // 3. Resolve entity names for top-level entities (batch per type)
    const entityIdsByType = new Map<AuditEntityType, number[]>();
    for (const event of assembledEvents) {
      const existing = entityIdsByType.get(event.topEntityType) || [];
      entityIdsByType.set(event.topEntityType, [...existing, event.topEntityId]);
    }

    const entityNameMaps = new Map<AuditEntityType, Map<number, string>>();
    await Promise.all(
      Array.from(entityIdsByType.entries()).map(async ([et, ids]) => {
        const nameMap = await resolveEntityNames(context.db, et, [...new Set(ids)]);
        entityNameMaps.set(et, nameMap);
      })
    );

    // 4. For verification cascades, query total child counts
    const totalChildCounts = new Map<string, number>();
    for (const event of assembledEvents) {
      if (!event.isCascade || event.childEntityType === null || event.childAffectedCount === 0) {
        continue;
      }

      const cacheKey = `${event.topEntityType}:${event.topEntityId}`;

      if (event.topEntityType === AuditEntityType.Tournament && event.childEntityType === AuditEntityType.Match) {
        const countResult = await context.db.execute(sql`
          SELECT COUNT(*)::int AS cnt FROM matches WHERE tournament_id = ${event.topEntityId}
        `);
        totalChildCounts.set(cacheKey, (countResult.rows[0] as { cnt: number } | undefined)?.cnt ?? 0);
      } else if (event.topEntityType === AuditEntityType.Match && event.childEntityType === AuditEntityType.Game) {
        const countResult = await context.db.execute(sql`
          SELECT COUNT(*)::int AS cnt FROM games WHERE match_id = ${event.topEntityId}
        `);
        totalChildCounts.set(cacheKey, (countResult.rows[0] as { cnt: number } | undefined)?.cnt ?? 0);
      } else if (event.topEntityType === AuditEntityType.Game && event.childEntityType === AuditEntityType.Score) {
        const countResult = await context.db.execute(sql`
          SELECT COUNT(*)::int AS cnt FROM game_scores WHERE game_id = ${event.topEntityId}
        `);
        totalChildCounts.set(cacheKey, (countResult.rows[0] as { cnt: number } | undefined)?.cnt ?? 0);
      }
    }

    // 5. Build referenced users from sample changes
    const allRefUserIds: number[] = [];
    for (const event of assembledEvents) {
      if (event.sampleChanges) {
        const ids = extractUserIdsFromChanges(
          event.sampleChanges as Record<string, { originalValue?: unknown; newValue?: unknown }>
        );
        allRefUserIds.push(...ids);
      }
    }
    const refUserMap = await resolveUserIds(context.db, allRefUserIds);

    // Map to AuditEvent[]
    const events: AuditEvent[] = assembledEvents.map((event) => {
      const actionUser = event.actionUserId
        ? userMap.get(event.actionUserId) ?? null
        : null;

      const topEntityNameMap = entityNameMaps.get(event.topEntityType);
      const topEntityName = topEntityNameMap?.get(event.topEntityId) ?? null;

      // Parent tournament: null when top entity IS a tournament
      let parentTournament: AuditEvent['parentTournament'] = null;
      if (
        event.topEntityType !== AuditEntityType.Tournament &&
        event.parentEntityId !== null
      ) {
        parentTournament = {
          id: event.parentEntityId,
          name: tournamentNameMap.get(event.parentEntityId) ?? null,
        };
      }

      // Child level
      let childLevel: AuditEvent['childLevel'] = null;
      if (event.childEntityType !== null && event.childAffectedCount > 0) {
        const cacheKey = `${event.topEntityType}:${event.topEntityId}`;
        const totalCount = totalChildCounts.get(cacheKey) ?? null;
        childLevel = {
          entityType: event.childEntityType,
          affectedCount: event.childAffectedCount,
          totalCount,
        };
      }

      // Referenced users from sample changes
      let referencedUsers: Record<string, ReferencedUser> | undefined;
      if (event.sampleChanges) {
        const ids = extractUserIdsFromChanges(
          event.sampleChanges as Record<string, { originalValue?: unknown; newValue?: unknown }>
        );
        if (ids.length > 0) {
          referencedUsers = {};
          for (const id of ids) {
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
        action: event.action,
        actionUserId: event.actionUserId,
        actionUser: actionUser
          ? {
              id: actionUser.id,
              playerId: actionUser.playerId,
              osuId: actionUser.osuId,
              username: actionUser.username,
            }
          : null,
        created: event.created,
        isSystem: event.isSystem,
        topEntity: {
          entityType: event.topEntityType,
          entityId: event.topEntityId,
          entityName: topEntityName,
          count: event.topEntityCount,
        },
        childLevel,
        isCascade: event.isCascade,
        parentTournament,
        changedFields: event.changedFields,
        sampleChanges: event.sampleChanges,
        referencedUsers,
      };
    });

    const nextCursor =
      hasMore && events.length > 0
        ? events[events.length - 1].created
        : null;

    return { events, nextCursor, hasMore };
  });

// ---------------------------------------------------------------------------
// Procedure 3: Event details (expandable view of a single event)
// ---------------------------------------------------------------------------

export const getEventDetails = publicProcedure
  .input(EventDetailsInputSchema)
  .output(EventDetailsResponseSchema)
  .route({
    summary: 'Get individual entries for an audit event',
    tags: ['audit'],
    method: 'GET',
    path: '/audit/event-details',
  })
  .handler(async ({ input, context }) => {
    const { actionUserId, created, entityType, cursor, limit } = input;

    // Determine which tables to query
    const tablesToQuery = entityType !== undefined
      ? [{ entityType }]
      : [...ALL_AUDIT_TABLES];

    const tableQueries = tablesToQuery.map(({ entityType: et }) => {
      const tableName = getTableNameString(et);
      const userCondition = actionUserId !== null
        ? sql`a.action_user_id = ${actionUserId}`
        : sql`a.action_user_id IS NULL`;

      const conditions = [
        userCondition,
        sql`a.created = ${created}::timestamptz`,
      ];

      if (cursor !== undefined) {
        conditions.push(sql`a.id < ${cursor}`);
      }

      return sql`
        SELECT
          a.id,
          ${et}::int AS entity_type,
          a.created,
          a.reference_id_lock,
          a.reference_id,
          a.action_user_id,
          a.action_type,
          a.changes,
          u.id AS user_id,
          p.id AS player_id,
          p.osu_id,
          p.username
        FROM ${sql.raw(tableName)} a
        LEFT JOIN users u ON u.id = a.action_user_id
        LEFT JOIN players p ON p.id = u.player_id
        WHERE ${sql.join(conditions, sql` AND `)}
      `;
    });

    const query = sql`
      SELECT * FROM (
        ${sql.join(tableQueries, sql` UNION ALL `)}
      ) combined
      ORDER BY id DESC
      LIMIT ${limit + 1}
    `;

    const result = await context.db.execute(query);
    const rows = result.rows as {
      id: number;
      entity_type: number;
      created: string;
      reference_id_lock: number;
      reference_id: number | null;
      action_user_id: number | null;
      action_type: number;
      changes: unknown;
      user_id: number | null;
      player_id: number | null;
      osu_id: string | null; // bigint returned as string by node-postgres
      username: string | null;
    }[];

    const hasMore = rows.length > limit;
    const trimmedRows = hasMore ? rows.slice(0, limit) : rows;

    // Collect referenced user IDs from changes for resolution
    const allRefUserIds: number[] = [];
    const normalizedChangesList: (Record<string, unknown> | null)[] = [];
    for (const row of trimmedRows) {
      const changes = camelizeChangesKeys(
        row.changes as Record<string, unknown> | null
      );
      normalizedChangesList.push(changes);
      const ids = extractUserIdsFromChanges(
        changes as Record<string, { originalValue?: unknown; newValue?: unknown }> | null
      );
      allRefUserIds.push(...ids);
    }
    const refUserMap = await resolveUserIds(context.db, allRefUserIds);

    // Resolve entity names for tournaments and matches
    const entityIdsByType = new Map<AuditEntityType, number[]>();
    for (const row of trimmedRows) {
      const et = row.entity_type as AuditEntityType;
      const existing = entityIdsByType.get(et) || [];
      entityIdsByType.set(et, [...existing, row.reference_id_lock]);
    }

    const entityNameMaps = new Map<AuditEntityType, Map<number, string>>();
    await Promise.all(
      Array.from(entityIdsByType.entries()).map(async ([et, ids]) => {
        const nameMap = await resolveEntityNames(context.db, et, [...new Set(ids)]);
        entityNameMaps.set(et, nameMap);
      })
    );

    const entries: AuditEntry[] = trimmedRows.map((row, i) => {
      const et = row.entity_type as AuditEntityType;
      const changes = normalizedChangesList[i];

      // Build referencedUsers
      let referencedUsers: Record<string, ReferencedUser> | undefined;
      if (changes) {
        const userIds = extractUserIdsFromChanges(
          changes as Record<string, { originalValue?: unknown; newValue?: unknown }>
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

      const entityNameMap = entityNameMaps.get(et);

      return {
        id: row.id,
        entityType: et,
        referenceIdLock: row.reference_id_lock,
        referenceId: row.reference_id,
        actionUserId: row.action_user_id,
        actionType: row.action_type as AuditActionType,
        changes,
        created: row.created,
        actionUser: row.user_id
          ? {
              id: row.user_id,
              playerId: row.player_id,
              osuId: row.osu_id !== null ? Number(row.osu_id) : null,
              username: row.username,
            }
          : null,
        referencedUsers,
        entityName: entityNameMap?.get(row.reference_id_lock) ?? null,
      };
    });

    const nextCursor =
      hasMore && trimmedRows.length > 0
        ? trimmedRows[trimmedRows.length - 1].id
        : null;

    return { entries, nextCursor, hasMore };
  });

// ---------------------------------------------------------------------------
// Procedure 4: Search audits
// ---------------------------------------------------------------------------

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

    const items = final.map((entry) => ({
      type: 'audit' as const,
      data: entry,
    }));

    const nextCursor =
      hasMore && final.length > 0 ? final[final.length - 1].id : null;

    return { items, nextCursor, hasMore };
  });

// ---------------------------------------------------------------------------
// Procedure 5: List admin users for autocomplete
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Procedure 6: Get parent matchId for game/score entities
// ---------------------------------------------------------------------------

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

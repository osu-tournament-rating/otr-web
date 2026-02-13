import { and, desc, eq, isNotNull, lt, or, sql, inArray } from 'drizzle-orm';
import * as schema from '@otr/core/db/schema';
import { AuditEntityType, AuditActionType } from '@otr/core/osu';

import {
  EntityAuditInputSchema,
  EntityTimelineResponseSchema,
  EventFeedInputSchema,
  EventFeedResponseSchema,
  EventDetailsInputSchema,
  EventDetailsResponseSchema,
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
  getAdminNotesTableNameString,
  getParentEntityJoinInfo,
  getTableNameString,
  ALL_AUDIT_TABLES,
  LIGHT_AUDIT_TABLES,
  camelizeChangesKeys,
  mergeTimelineItems,
  assembleEvents,
  classifyAction,
  getImmediateChildType,
  buildChildSummary,
  buildFieldChangeConditions,
  buildReferencedUsers,
  extractUserIdsFromChanges,
  resolveEntityNamesBatched,
  resolveUserIds,
  resolveTournamentNames,
  type ReferencedUser,
  type GroupedAuditRow,
  type AssembledEvent,
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

/** Validate that a field name is a safe SQL identifier (alphanumeric + underscore) */
const SAFE_FIELD_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function validateFieldNames(fieldNames: string[]): string[] {
  return fieldNames.filter((name) => SAFE_FIELD_NAME_RE.test(name));
}

function mapAuditRow(
  row: AuditRow,
  entityType: AuditEntityType,
  userMap?: Map<number, ReferencedUser>,
  precomputedChanges?: Record<string, unknown> | null
): AuditEntry {
  const changes =
    precomputedChanges !== undefined
      ? precomputedChanges
      : camelizeChangesKeys(row.changes as Record<string, unknown> | null);

  const referencedUsers = userMap
    ? buildReferencedUsers(changes, userMap)
    : undefined;

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
    ids?: number[];
    cursor?: number;
    limit: number;
    offset?: number;
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

  if (options.ids !== undefined && options.ids.length > 0) {
    conditions.push(inArray(table.id, options.ids));
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
    conditions.push(sql`${table.created} >= ${options.dateFrom}::timestamptz`);
  }

  if (options.dateTo) {
    conditions.push(sql`${table.created} <= ${options.dateTo}::timestamptz`);
  }

  if (options.fieldNames && options.fieldNames.length > 0) {
    // Validate field names to prevent injection
    const safeFieldNames = validateFieldNames(options.fieldNames);
    if (safeFieldNames.length === 0) {
      return [];
    }
    const fieldConditions = buildFieldChangeConditions(
      sql`${table.changes}`,
      safeFieldNames
    );
    conditions.push(or(...fieldConditions)!);

    if (options.changeValue && safeFieldNames.length === 1) {
      // changeValue only works when filtering by a single field
      conditions.push(
        sql`${table.changes} @> ${JSON.stringify({
          [safeFieldNames[0]]: {
            newValue: tryParseJsonValue(options.changeValue),
          },
        })}::jsonb`
      );
    }
  }

  if (options.entityId !== undefined) {
    conditions.push(eq(table.referenceIdLock, options.entityId));
  }

  if (options.cursorTimestamp) {
    conditions.push(
      sql`${table.created} < ${options.cursorTimestamp}::timestamptz`
    );
  }

  let query = db
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
    .limit(options.limit)
    .$dynamic();

  if (options.offset !== undefined) {
    query = query.offset(options.offset);
  }

  const rows = await query;

  // Pre-compute camelized changes and collect user IDs in one pass
  const allUserIds: number[] = [];
  const camelizedChanges: (Record<string, unknown> | null)[] = [];
  for (const row of rows) {
    const changes = camelizeChangesKeys(
      row.changes as Record<string, unknown> | null
    );
    camelizedChanges.push(changes);
    const ids = extractUserIdsFromChanges(
      changes as Record<
        string,
        { originalValue?: unknown; newValue?: unknown }
      > | null
    );
    allUserIds.push(...ids);
  }

  // Resolve all user IDs in a single batch query
  const userMap = await resolveUserIds(db, allUserIds);

  return (rows as AuditRow[]).map((row, i) =>
    mapAuditRow(row, entityType, userMap, camelizedChanges[i])
  );
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

type CascadeSiblingRow = {
  entity_type: number;
  cnt: number;
  sample_id: number;
  sample_changes: unknown;
};

export const getEntityAuditTimeline = publicProcedure
  .input(EntityAuditInputSchema)
  .output(EntityTimelineResponseSchema)
  .route({
    summary: 'Get audit timeline for a specific entity',
    description: [
      'Returns the full audit history and admin notes for a single entity, sorted in reverse chronological order.',
      '',
      '**Entity types** (`entityType` parameter):',
      '- `0` — Tournament',
      '- `1` — Match',
      '- `2` — Game',
      '- `3` — Score',
      '',
      'Each timeline item is either an `audit` entry (a recorded change) or a `note` (an admin comment).',
      'Audit entries that were part of a bulk cascade operation include a `cascadeContext` object describing',
      'the top-level entity that triggered the change and a human-readable child summary (e.g. "also affected 85 of 118 matches").',
      '',
      '**Pagination** — offset-based with `page` and `pageSize` parameters.',
      'The response includes `page`, `pageSize`, `pages` (total page count), and `total` (total item count).',
      '',
      '**Examples**',
      '```',
      'GET /audit/timeline?entityType=0&entityId=42',
      'GET /audit/timeline?entityType=1&entityId=100&pageSize=25',
      'GET /audit/timeline?entityType=0&entityId=42&page=2&pageSize=50',
      '```',
    ].join('\n'),
    tags: ['public'],
    method: 'GET',
    path: '/audit/timeline',
  })
  .handler(async ({ input, context }) => {
    const { entityType, entityId } = input;
    const DEFAULT_PAGE_SIZE = 50;
    const MAX_PAGE_SIZE = 100;

    const page = Math.max(input.page ?? 1, 1);
    const pageSize = Math.max(
      1,
      Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    );

    const auditTableName = getTableNameString(entityType);
    const notesTableName = getAdminNotesTableNameString(entityType);

    // Count total timeline items (audit entries + admin notes)
    const countResult = await context.db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM ${sql.raw(auditTableName)} WHERE reference_id_lock = ${entityId}) AS audit_count,
        (SELECT COUNT(*)::int FROM ${sql.raw(notesTableName)} WHERE reference_id = ${entityId}) AS note_count
    `);
    const { audit_count: auditCount, note_count: noteCount } = countResult
      .rows[0] as { audit_count: number; note_count: number };

    const total = auditCount + noteCount;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const offset = Math.max(0, (currentPage - 1) * pageSize);

    // Get the IDs and types for the current page via UNION ALL
    const pageItemResult = await context.db.execute(sql`
      SELECT item_id, item_type FROM (
        SELECT id AS item_id, 'audit'::text AS item_type, created
        FROM ${sql.raw(auditTableName)}
        WHERE reference_id_lock = ${entityId}
        UNION ALL
        SELECT id AS item_id, 'note'::text AS item_type, created
        FROM ${sql.raw(notesTableName)}
        WHERE reference_id = ${entityId}
      ) merged
      ORDER BY created DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);
    const pageItemRows = pageItemResult.rows as {
      item_id: number;
      item_type: string;
    }[];
    const auditIds = pageItemRows
      .filter((r) => r.item_type === 'audit')
      .map((r) => r.item_id);
    const noteIds = pageItemRows
      .filter((r) => r.item_type === 'note')
      .map((r) => r.item_id);

    // Fetch full audit entries and notes for this page in parallel
    const [trimmedEntries, noteRows] = await Promise.all([
      auditIds.length > 0
        ? queryAuditEntries(context.db, entityType, {
            ids: auditIds,
            limit: auditIds.length,
          })
        : Promise.resolve([] as AuditEntry[]),
      noteIds.length > 0
        ? (async () => {
            const notesTable = getAdminNotesTable(entityType);
            return context.db
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
              .leftJoin(
                schema.users,
                eq(schema.users.id, notesTable.adminUserId)
              )
              .leftJoin(
                schema.players,
                eq(schema.players.id, schema.users.playerId)
              )
              .where(inArray(notesTable.id, noteIds));
          })()
        : Promise.resolve([] as AdminNoteRow[]),
    ]);

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
      const parentTournamentId =
        (parentResult.rows[0] as { parent_id: number | null } | undefined)
          ?.parent_id ?? null;

      if (parentTournamentId !== null) {
        // Batch all sibling queries in parallel
        const pairEntries = Array.from(cascadePairs.entries());
        const siblingResults = await Promise.all(
          pairEntries.map(([, { actionUserId, created }]) => {
            const siblingQueries = ALL_AUDIT_TABLES.map(
              ({ entityType: et }) => {
                const info = getParentEntityJoinInfo(et);
                const userCondition =
                  actionUserId !== null
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
              }
            );
            return context.db.execute(
              sql`${sql.join(siblingQueries, sql` UNION ALL `)}`
            );
          })
        );

        // Process results and collect IDs for batched resolution
        type CascadeInfo = {
          key: string;
          topEntityType: AuditEntityType;
          topEntityId: number;
          action: ReturnType<typeof classifyAction>;
          childType: AuditEntityType | null;
          childAffectedCount: number;
        };
        const cascadeInfos: CascadeInfo[] = [];

        for (let i = 0; i < pairEntries.length; i++) {
          const [key, { actionUserId }] = pairEntries[i];
          const siblingRows = siblingResults[i].rows as CascadeSiblingRow[];

          if (siblingRows.length <= 1) continue;

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

          const childType = getImmediateChildType(topEntityType);
          let childAffectedCount = 0;
          if (childType !== null) {
            for (const sr of siblingRows) {
              if (sr.entity_type === childType) {
                childAffectedCount = sr.cnt;
              }
            }
          }

          cascadeInfos.push({
            key,
            topEntityType,
            topEntityId,
            action,
            childType,
            childAffectedCount,
          });
        }

        // Batch child count queries by entity type
        const childCountQueries: {
          cacheKey: string;
          query: Promise<{ cnt: number }[]>;
        }[] = [];
        for (const info of cascadeInfos) {
          if (info.childType === null || info.childAffectedCount === 0)
            continue;
          const cacheKey = `${info.topEntityType}:${info.topEntityId}`;
          if (
            info.topEntityType === AuditEntityType.Tournament &&
            info.childType === AuditEntityType.Match
          ) {
            childCountQueries.push({
              cacheKey,
              query: context.db
                .select({ cnt: sql<number>`count(*)::int` })
                .from(schema.matches)
                .where(eq(schema.matches.tournamentId, info.topEntityId)),
            });
          } else if (
            info.topEntityType === AuditEntityType.Match &&
            info.childType === AuditEntityType.Game
          ) {
            childCountQueries.push({
              cacheKey,
              query: context.db
                .select({ cnt: sql<number>`count(*)::int` })
                .from(schema.games)
                .where(eq(schema.games.matchId, info.topEntityId)),
            });
          } else if (
            info.topEntityType === AuditEntityType.Game &&
            info.childType === AuditEntityType.Score
          ) {
            childCountQueries.push({
              cacheKey,
              query: context.db
                .select({ cnt: sql<number>`count(*)::int` })
                .from(schema.gameScores)
                .where(eq(schema.gameScores.gameId, info.topEntityId)),
            });
          }
        }

        const totalChildCounts = new Map<string, number>();
        if (childCountQueries.length > 0) {
          const countResults = await Promise.all(
            childCountQueries.map((q) => q.query)
          );
          for (let i = 0; i < childCountQueries.length; i++) {
            const cnt = countResults[i][0]?.cnt ?? 0;
            totalChildCounts.set(childCountQueries[i].cacheKey, cnt);
          }
        }

        // Batch entity name resolution
        const entityNameMaps = await resolveEntityNamesBatched(
          context.db,
          cascadeInfos.map((info) => ({
            entityType: info.topEntityType,
            entityId: info.topEntityId,
          }))
        );

        // Build cascade context map
        for (const info of cascadeInfos) {
          const topEntityName =
            entityNameMaps.get(info.topEntityType)?.get(info.topEntityId) ??
            null;
          const cacheKey = `${info.topEntityType}:${info.topEntityId}`;
          const totalChildCount = totalChildCounts.get(cacheKey) ?? null;

          const childSummary =
            info.childType !== null && info.childAffectedCount > 0
              ? buildChildSummary(
                  info.childType,
                  info.childAffectedCount,
                  totalChildCount
                )
              : null;

          cascadeContextMap.set(info.key, {
            topEntityType: info.topEntityType,
            topEntityId: info.topEntityId,
            topEntityName,
            action: info.action,
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

    return { page: currentPage, pageSize, pages, total, items };
  });

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
          conditions.push(
            sql`a.action_type IN (${sql.join(
              actionTypes.map((a) => sql`${a}`),
              sql`, `
            )})`
          );
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
      const rawFieldNames = fieldsByEntityType.get(entityType);
      const entityFieldNames = rawFieldNames
        ? validateFieldNames(rawFieldNames)
        : undefined;
      if (entityFieldNames && entityFieldNames.length > 0) {
        const fieldConditions = buildFieldChangeConditions(
          sql.raw('a.changes'),
          entityFieldNames
        );
        conditions.push(or(...fieldConditions)!);
      }

      const whereClause =
        conditions.length > 0
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
        ? await resolveUserIds(context.db, actionUserIds)
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
    const entityNameMaps = await resolveEntityNamesBatched(
      context.db,
      assembledEvents.map((e) => ({
        entityType: e.topEntityType,
        entityId: e.topEntityId,
      }))
    );

    // 4. For verification cascades, batch total child counts by entity type
    const totalChildCounts = new Map<string, number>();
    const tournamentIdsForMatchCount: number[] = [];
    const matchIdsForGameCount: number[] = [];
    const gameIdsForScoreCount: number[] = [];

    for (const event of assembledEvents) {
      if (
        !event.isCascade ||
        event.childEntityType === null ||
        event.childAffectedCount === 0
      )
        continue;
      if (
        event.topEntityType === AuditEntityType.Tournament &&
        event.childEntityType === AuditEntityType.Match
      ) {
        tournamentIdsForMatchCount.push(event.topEntityId);
      } else if (
        event.topEntityType === AuditEntityType.Match &&
        event.childEntityType === AuditEntityType.Game
      ) {
        matchIdsForGameCount.push(event.topEntityId);
      } else if (
        event.topEntityType === AuditEntityType.Game &&
        event.childEntityType === AuditEntityType.Score
      ) {
        gameIdsForScoreCount.push(event.topEntityId);
      }
    }

    await Promise.all([
      tournamentIdsForMatchCount.length > 0
        ? context.db
            .select({
              id: schema.matches.tournamentId,
              cnt: sql<number>`count(*)::int`,
            })
            .from(schema.matches)
            .where(
              inArray(schema.matches.tournamentId, tournamentIdsForMatchCount)
            )
            .groupBy(schema.matches.tournamentId)
            .then((rows) => {
              for (const row of rows) {
                totalChildCounts.set(
                  `${AuditEntityType.Tournament}:${row.id}`,
                  row.cnt
                );
              }
            })
        : Promise.resolve(),
      matchIdsForGameCount.length > 0
        ? context.db
            .select({
              id: schema.games.matchId,
              cnt: sql<number>`count(*)::int`,
            })
            .from(schema.games)
            .where(inArray(schema.games.matchId, matchIdsForGameCount))
            .groupBy(schema.games.matchId)
            .then((rows) => {
              for (const row of rows) {
                totalChildCounts.set(
                  `${AuditEntityType.Match}:${row.id}`,
                  row.cnt
                );
              }
            })
        : Promise.resolve(),
      gameIdsForScoreCount.length > 0
        ? context.db
            .select({
              id: schema.gameScores.gameId,
              cnt: sql<number>`count(*)::int`,
            })
            .from(schema.gameScores)
            .where(inArray(schema.gameScores.gameId, gameIdsForScoreCount))
            .groupBy(schema.gameScores.gameId)
            .then((rows) => {
              for (const row of rows) {
                totalChildCounts.set(
                  `${AuditEntityType.Game}:${row.id}`,
                  row.cnt
                );
              }
            })
        : Promise.resolve(),
    ]);

    // 5. Build referenced users from sample changes
    const allRefUserIds: number[] = [];
    for (const event of assembledEvents) {
      if (event.sampleChanges) {
        const ids = extractUserIdsFromChanges(
          event.sampleChanges as Record<
            string,
            { originalValue?: unknown; newValue?: unknown }
          >
        );
        allRefUserIds.push(...ids);
      }
    }
    const refUserMap = await resolveUserIds(context.db, allRefUserIds);

    // Map to AuditEvent[]
    const events: AuditEvent[] = assembledEvents.map((event) => {
      const actionUser = event.actionUserId
        ? (userMap.get(event.actionUserId) ?? null)
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

      const referencedUsers = buildReferencedUsers(
        event.sampleChanges,
        refUserMap
      );

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

    // Use earliestCreated for cursor to avoid pagination duplicates
    // when system events have been aggregated across multiple timestamps
    const lastAssembled = assembledEvents[assembledEvents.length - 1] as
      | AssembledEvent
      | undefined;
    const nextCursor =
      hasMore && lastAssembled
        ? (lastAssembled.earliestCreated ?? lastAssembled.created)
        : null;

    return { events, nextCursor, hasMore };
  });

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
    const tablesToQuery =
      entityType !== undefined ? [{ entityType }] : [...ALL_AUDIT_TABLES];

    const tableQueries = tablesToQuery.map(({ entityType: et }) => {
      const tableName = getTableNameString(et);
      const userCondition =
        actionUserId !== null
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
        changes as Record<
          string,
          { originalValue?: unknown; newValue?: unknown }
        > | null
      );
      allRefUserIds.push(...ids);
    }
    const refUserMap = await resolveUserIds(context.db, allRefUserIds);

    // Resolve entity names for tournaments and matches
    const entityNameMaps = await resolveEntityNamesBatched(
      context.db,
      trimmedRows.map((row) => ({
        entityType: row.entity_type as AuditEntityType,
        entityId: row.reference_id_lock,
      }))
    );

    const entries: AuditEntry[] = trimmedRows.map((row, i) => {
      const et = row.entity_type as AuditEntityType;
      const changes = normalizedChangesList[i];

      const referencedUsers = buildReferencedUsers(changes, refUserMap);

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

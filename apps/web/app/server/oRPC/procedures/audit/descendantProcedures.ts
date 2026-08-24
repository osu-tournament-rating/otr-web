import { ORPCError } from '@orpc/server';
import { sql } from 'drizzle-orm';
import { AuditActionType, AuditEntityType } from '@otr/core/osu';

import {
  DescendantAuditCountsInputSchema,
  DescendantAuditCountsResponseSchema,
  DescendantAuditInputSchema,
  DescendantAuditResponseSchema,
  type DescendantAuditItem,
} from '@/lib/orpc/schema/audit';

import { getDescendantTypes } from '@/lib/audit-entity-types';

import { publicProcedure } from '../base';
import { getAncestryJoinInfo } from './ancestry';
import {
  buildReferencedUsers,
  camelizeChangesKeys,
  extractUserIdsFromChanges,
  resolveEntityNamesBatched,
  resolveUserIds,
} from './helpers';

/** Counting every score audit under a large tournament is not worth the wait. */
const COUNT_CAP = 5000;

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function pathColumn(entityType: AuditEntityType): string {
  return `path_${entityType}`;
}

/** System rows carry no action user; they are noise unless explicitly requested. */
function buildWhereClause(
  ancestorIdExpr: string,
  entityId: number,
  showSystem: boolean | undefined
) {
  const scope = sql`${sql.raw(ancestorIdExpr)} = ${entityId}`;
  return showSystem ? scope : sql`${scope} AND a.action_user_id IS NOT NULL`;
}

export const getDescendantAuditCounts = publicProcedure
  .input(DescendantAuditCountsInputSchema)
  .output(DescendantAuditCountsResponseSchema)
  .route({
    summary: 'Count audit entries recorded against an entity’s children',
    description: [
      'Returns how many audit entries exist for each level below an entity: matches, games and scores',
      'for a tournament; games and scores for a match; scores for a game.',
      '',
      `Counting stops at ${COUNT_CAP} entries per level. When the cap is reached, \`capped\` is true`,
      'and `count` is a lower bound.',
      '',
      '**Example**',
      '```',
      'GET /audit/descendant-counts?entityType=0&entityId=42',
      '```',
    ].join('\n'),
    tags: ['public'],
    method: 'GET',
    path: '/audit/descendant-counts',
  })
  .handler(async ({ input, context }) => {
    const { entityType, entityId, showSystem } = input;
    const descendantTypes = getDescendantTypes(entityType);

    if (descendantTypes.length === 0) {
      return { counts: [] };
    }

    const queries = descendantTypes.flatMap((descendantType) => {
      const info = getAncestryJoinInfo(descendantType, entityType);
      if (!info) return [];

      return [
        sql`
          SELECT ${descendantType}::int AS entity_type, count(*)::int AS cnt
          FROM (
            SELECT 1
            FROM ${sql.raw(info.fromClause)}
            WHERE ${buildWhereClause(info.ancestorIdExpr, entityId, showSystem)}
            LIMIT ${COUNT_CAP + 1}
          ) capped
        `,
      ];
    });

    const result = await context.db.execute(
      sql`${sql.join(queries, sql` UNION ALL `)}`
    );
    const rows = result.rows as { entity_type: number; cnt: number }[];

    const counts = rows
      .map((row) => ({
        entityType: row.entity_type as AuditEntityType,
        count: Math.min(row.cnt, COUNT_CAP),
        capped: row.cnt > COUNT_CAP,
      }))
      .sort((a, b) => a.entityType - b.entityType);

    return { counts };
  });

export const getDescendantAuditTimeline = publicProcedure
  .input(DescendantAuditInputSchema)
  .output(DescendantAuditResponseSchema)
  .route({
    summary: 'Get audit history for an entity’s children',
    description: [
      'Returns the audit entries recorded against every descendant of a given type, newest first.',
      'Use it to see what a tournament rejection did to its matches, games and scores.',
      '',
      '`descendantType` must sit below `entityType` in the hierarchy',
      '(tournament → match → game → score).',
      '',
      'Each item carries the descendant it belongs to, plus the intermediate entities between it',
      'and the requested entity, so the result can be linked back to each child’s own audit page.',
      '',
      '**Pagination** — offset-based with `page` and `pageSize`.',
      `\`total\` stops counting at ${COUNT_CAP}; \`totalCapped\` marks it as a lower bound.`,
      '',
      '**Examples**',
      '```',
      'GET /audit/descendants?entityType=0&entityId=42&descendantType=1',
      'GET /audit/descendants?entityType=0&entityId=42&descendantType=3&page=2',
      '```',
    ].join('\n'),
    tags: ['public'],
    method: 'GET',
    path: '/audit/descendants',
  })
  .handler(async ({ input, context }) => {
    const { entityType, entityId, descendantType, showSystem } = input;

    const info = getAncestryJoinInfo(descendantType, entityType);
    if (!info) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Requested entity type is not a descendant of the entity',
      });
    }

    const page = Math.max(input.page ?? 1, 1);
    const pageSize = Math.max(
      1,
      Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    );

    const whereClause = buildWhereClause(
      info.ancestorIdExpr,
      entityId,
      showSystem
    );

    const countResult = await context.db.execute(sql`
      SELECT count(*)::int AS cnt
      FROM (
        SELECT 1
        FROM ${sql.raw(info.fromClause)}
        WHERE ${whereClause}
        LIMIT ${COUNT_CAP + 1}
      ) capped
    `);
    const rawTotal = (countResult.rows[0] as { cnt: number }).cnt;
    const totalCapped = rawTotal > COUNT_CAP;
    const total = Math.min(rawTotal, COUNT_CAP);

    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const offset = Math.max(0, (currentPage - 1) * pageSize);

    if (total === 0) {
      return {
        page: currentPage,
        pageSize,
        pages,
        total,
        totalCapped,
        items: [],
      };
    }

    const nameSelection = info.nameExpr
      ? sql`${sql.raw(info.nameExpr)} AS entity_name`
      : sql`NULL::text AS entity_name`;
    const pathSelections = info.pathExprs.map(
      ({ entityType: pathType, expr }) =>
        sql`${sql.raw(expr)} AS ${sql.raw(pathColumn(pathType))}`
    );

    const selections = [
      sql`a.id`,
      sql`a.created`,
      sql`a.reference_id_lock`,
      sql`a.reference_id`,
      sql`a.action_user_id`,
      sql`a.action_type`,
      sql`a.changes`,
      nameSelection,
      sql`u.id AS user_id`,
      sql`p.id AS player_id`,
      sql`p.osu_id`,
      sql`p.username`,
      ...pathSelections,
    ];

    const result = await context.db.execute(sql`
      SELECT ${sql.join(selections, sql`, `)}
      FROM ${sql.raw(info.fromClause)}
      LEFT JOIN users u ON u.id = a.action_user_id
      LEFT JOIN players p ON p.id = u.player_id
      WHERE ${whereClause}
      ORDER BY a.created DESC, a.id DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const rows = result.rows as (Record<string, unknown> & {
      id: number;
      created: string;
      reference_id_lock: number;
      reference_id: number | null;
      action_user_id: number | null;
      action_type: number;
      changes: unknown;
      entity_name: string | null;
      user_id: number | null;
      player_id: number | null;
      osu_id: string | null;
      username: string | null;
    })[];

    const referencedUserIds: number[] = [];
    const changesList = rows.map((row) => {
      const changes = camelizeChangesKeys(
        row.changes as Record<string, unknown> | null
      );
      referencedUserIds.push(
        ...extractUserIdsFromChanges(
          changes as Record<
            string,
            { originalValue?: unknown; newValue?: unknown }
          > | null
        )
      );
      return changes;
    });

    const pathEntries = rows.flatMap((row) =>
      info.pathExprs.flatMap(({ entityType: pathType }) => {
        const value = row[pathColumn(pathType)];
        return typeof value === 'number'
          ? [{ entityType: pathType, entityId: value }]
          : [];
      })
    );

    const [referencedUserMap, pathNameMaps] = await Promise.all([
      resolveUserIds(context.db, referencedUserIds),
      resolveEntityNamesBatched(context.db, pathEntries),
    ]);

    const items: DescendantAuditItem[] = rows.map((row, index) => {
      const changes = changesList[index];

      return {
        entry: {
          id: row.id,
          entityType: descendantType,
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
          referencedUsers: buildReferencedUsers(changes, referencedUserMap),
        },
        entity: {
          entityType: descendantType,
          entityId: row.reference_id_lock,
          entityName: row.entity_name,
          path: info.pathExprs.flatMap(({ entityType: pathType }) => {
            const value = row[pathColumn(pathType)];
            if (typeof value !== 'number') return [];
            return [
              {
                entityType: pathType,
                entityId: value,
                entityName: pathNameMaps.get(pathType)?.get(value) ?? null,
              },
            ];
          }),
        },
      };
    });

    return { page: currentPage, pageSize, pages, total, totalCapped, items };
  });

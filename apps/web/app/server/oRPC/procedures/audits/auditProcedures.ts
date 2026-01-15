import { ORPCError } from '@orpc/server';
import { and, desc, asc, eq, isNotNull, lt, gt, count, max } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { ReportEntityType } from '@otr/core/osu/enums';

import {
  AuditListInputSchema,
  AuditListResponseSchema,
  AuditGetInputSchema,
  AuditDetailResponseSchema,
  AuditEntityHistoryInputSchema,
  AuditEntityType,
  AuditRecord,
  GetEntityStateInputSchema,
  AuditEntityStateSchema,
  ListRecentlyAuditedEntitiesInputSchema,
  ListRecentlyAuditedEntitiesResponseSchema,
  RecentlyAuditedEntity,
} from '@/lib/orpc/schema/audit';

import { publicProcedure } from '../base';

type DbClient = typeof import('@/lib/db').db;

const AUDIT_TABLES = {
  [ReportEntityType.Tournament]: schema.tournamentAudits,
  [ReportEntityType.Match]: schema.matchAudits,
  [ReportEntityType.Game]: schema.gameAudits,
  [ReportEntityType.Score]: schema.gameScoreAudits,
} as const;

type ChangeValue = {
  originalValue: unknown;
  newValue: unknown;
};

function normalizeChanges(
  changes: unknown
): Record<string, ChangeValue> | null {
  if (!changes || typeof changes !== 'object') return null;

  const normalized: Record<string, ChangeValue> = {};

  for (const [key, value] of Object.entries(
    changes as Record<string, unknown>
  )) {
    if (value && typeof value === 'object') {
      const v = value as Record<string, unknown>;
      normalized[key] = {
        originalValue: v.originalValue ?? v.OriginalValue ?? null,
        newValue: v.newValue ?? v.NewValue ?? null,
      };
    }
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

async function getEntityDisplayName(
  db: DbClient,
  entityType: AuditEntityType,
  referenceId: number | null,
  referenceIdLock: number
): Promise<string> {
  const entityId = referenceId ?? referenceIdLock;

  switch (entityType) {
    case ReportEntityType.Tournament: {
      if (referenceId) {
        const tournament = await db.query.tournaments.findFirst({
          columns: { name: true },
          where: eq(schema.tournaments.id, referenceId),
        });
        if (tournament?.name) return tournament.name;
      }
      return `Tournament #${entityId}`;
    }
    case ReportEntityType.Match: {
      if (referenceId) {
        const match = await db.query.matches.findFirst({
          columns: { name: true },
          where: eq(schema.matches.id, referenceId),
        });
        if (match?.name) return match.name;
      }
      return `Match #${entityId}`;
    }
    case ReportEntityType.Game: {
      if (referenceId) {
        const game = await db.query.games.findFirst({
          columns: { id: true },
          where: eq(schema.games.id, referenceId),
          with: {
            beatmap: {
              columns: { diffName: true },
              with: {
                beatmapset: {
                  columns: { title: true },
                },
              },
            },
          },
        });
        if (game?.beatmap) {
          return `${game.beatmap.beatmapset?.title ?? 'Unknown'} [${game.beatmap.diffName}]`;
        }
      }
      return `Game #${entityId}`;
    }
    case ReportEntityType.Score: {
      if (referenceId) {
        const score = await db.query.gameScores.findFirst({
          columns: { id: true },
          where: eq(schema.gameScores.id, referenceId),
          with: {
            player: {
              columns: { username: true },
            },
          },
        });
        if (score?.player?.username) {
          return `${score.player.username}'s score`;
        }
      }
      return `Score #${entityId}`;
    }
    default:
      return `Entity #${entityId}`;
  }
}

async function enrichAuditWithActor(db: DbClient, actionUserId: number | null) {
  if (!actionUserId) return null;

  const user = await db.query.users.findFirst({
    columns: { id: true },
    where: eq(schema.users.id, actionUserId),
    with: {
      player: {
        columns: {
          id: true,
          osuId: true,
          username: true,
          country: true,
        },
      },
    },
  });

  return user ? { id: user.id, player: user.player ?? null } : null;
}

async function getEntityCurrentState(
  db: DbClient,
  entityType: AuditEntityType,
  referenceId: number | null
) {
  if (!referenceId) {
    return { exists: false, data: null };
  }

  switch (entityType) {
    case ReportEntityType.Tournament: {
      const tournament = await db.query.tournaments.findFirst({
        where: eq(schema.tournaments.id, referenceId),
      });
      return { exists: !!tournament, data: tournament ?? null };
    }
    case ReportEntityType.Match: {
      const match = await db.query.matches.findFirst({
        where: eq(schema.matches.id, referenceId),
      });
      return { exists: !!match, data: match ?? null };
    }
    case ReportEntityType.Game: {
      const game = await db.query.games.findFirst({
        where: eq(schema.games.id, referenceId),
        with: {
          beatmap: {
            with: {
              beatmapset: true,
            },
          },
        },
      });
      return { exists: !!game, data: game ?? null };
    }
    case ReportEntityType.Score: {
      const score = await db.query.gameScores.findFirst({
        where: eq(schema.gameScores.id, referenceId),
        with: {
          player: true,
        },
      });
      return { exists: !!score, data: score ?? null };
    }
    default:
      return { exists: false, data: null };
  }
}

type RawAuditRow = {
  id: number;
  created: string;
  referenceIdLock: number;
  referenceId: number | null;
  actionUserId: number | null;
  actionType: number;
  changes: unknown;
};

async function queryAuditsFromTable(
  db: DbClient,
  entityType: AuditEntityType,
  options: {
    cursor?: number;
    limit: number;
    descending: boolean;
    sort: 'created' | 'id';
    userActionsOnly: boolean;
    actionUserId?: number;
    referenceId?: number;
  }
): Promise<{ audits: RawAuditRow[]; entityType: AuditEntityType }[]> {
  const table = AUDIT_TABLES[entityType];
  const conditions = [];

  if (options.userActionsOnly) {
    conditions.push(isNotNull(table.actionUserId));
  }

  if (options.actionUserId !== undefined) {
    conditions.push(eq(table.actionUserId, options.actionUserId));
  }

  if (options.referenceId !== undefined) {
    conditions.push(eq(table.referenceIdLock, options.referenceId));
  }

  if (options.cursor !== undefined) {
    if (options.descending) {
      conditions.push(lt(table.id, options.cursor));
    } else {
      conditions.push(gt(table.id, options.cursor));
    }
  }

  const orderBy = options.descending ? desc(table.id) : asc(table.id);

  const results = await db
    .select({
      id: table.id,
      created: table.created,
      referenceIdLock: table.referenceIdLock,
      referenceId: table.referenceId,
      actionUserId: table.actionUserId,
      actionType: table.actionType,
      changes: table.changes,
    })
    .from(table)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy)
    .limit(options.limit + 1);

  return [{ audits: results, entityType }];
}

async function queryAllAuditTables(
  db: DbClient,
  options: {
    cursor?: number;
    limit: number;
    descending: boolean;
    sort: 'created' | 'id';
    userActionsOnly: boolean;
    actionUserId?: number;
  }
): Promise<{ audits: RawAuditRow[]; entityType: AuditEntityType }[]> {
  const entityTypes = [
    ReportEntityType.Tournament,
    ReportEntityType.Match,
    ReportEntityType.Game,
    ReportEntityType.Score,
  ] as const;

  const results = await Promise.all(
    entityTypes.map((entityType) =>
      queryAuditsFromTable(db, entityType, {
        ...options,
        limit: options.limit + 1,
      })
    )
  );

  return results.flat();
}

function mergeAndSortAudits(
  tableResults: { audits: RawAuditRow[]; entityType: AuditEntityType }[],
  descending: boolean,
  limit: number
): { audit: RawAuditRow; entityType: AuditEntityType }[] {
  const allAudits: { audit: RawAuditRow; entityType: AuditEntityType }[] = [];

  for (const { audits, entityType } of tableResults) {
    for (const audit of audits) {
      allAudits.push({ audit, entityType });
    }
  }

  allAudits.sort((a, b) => {
    const comparison = a.audit.id - b.audit.id;
    return descending ? -comparison : comparison;
  });

  return allAudits.slice(0, limit + 1);
}

async function enrichAudits(
  db: DbClient,
  audits: { audit: RawAuditRow; entityType: AuditEntityType }[]
): Promise<AuditRecord[]> {
  const enriched = await Promise.all(
    audits.map(async ({ audit, entityType }) => {
      const [actor, entityDisplayName] = await Promise.all([
        enrichAuditWithActor(db, audit.actionUserId),
        getEntityDisplayName(
          db,
          entityType,
          audit.referenceId,
          audit.referenceIdLock
        ),
      ]);

      return {
        id: audit.id,
        entityType,
        created: audit.created,
        referenceIdLock: audit.referenceIdLock,
        referenceId: audit.referenceId,
        actionUserId: audit.actionUserId,
        actionType: audit.actionType,
        changes: normalizeChanges(audit.changes),
        actor,
        entityDisplayName,
      };
    })
  );

  return enriched;
}

export const listAudits = publicProcedure
  .input(AuditListInputSchema)
  .output(AuditListResponseSchema)
  .route({
    summary: 'List audit records with cursor-based pagination',
    tags: ['audits'],
    method: 'GET',
    path: '/audits',
  })
  .handler(async ({ input, context }) => {
    const {
      entityType,
      cursor,
      limit,
      descending,
      sort,
      userActionsOnly,
      actionUserId,
      referenceId,
    } = input;

    let tableResults: { audits: RawAuditRow[]; entityType: AuditEntityType }[];

    if (entityType !== undefined) {
      tableResults = await queryAuditsFromTable(context.db, entityType, {
        cursor,
        limit,
        descending,
        sort,
        userActionsOnly,
        actionUserId,
        referenceId,
      });
    } else {
      tableResults = await queryAllAuditTables(context.db, {
        cursor,
        limit,
        descending,
        sort,
        userActionsOnly,
        actionUserId,
      });
    }

    const merged = mergeAndSortAudits(tableResults, descending, limit);
    const hasMore = merged.length > limit;
    const auditsToReturn = merged.slice(0, limit);
    const enrichedAudits = await enrichAudits(context.db, auditsToReturn);

    const nextCursor =
      hasMore && enrichedAudits.length > 0
        ? enrichedAudits[enrichedAudits.length - 1].id
        : null;

    return {
      audits: enrichedAudits,
      nextCursor,
      hasMore,
    };
  });

export const getAudit = publicProcedure
  .input(AuditGetInputSchema)
  .output(AuditDetailResponseSchema)
  .route({
    summary: 'Get single audit with current entity state',
    tags: ['audits'],
    method: 'GET',
    path: '/audits/{entityType}/{id}',
  })
  .handler(async ({ input, context }) => {
    const { entityType, id } = input;
    const table = AUDIT_TABLES[entityType];

    const audit = await context.db
      .select({
        id: table.id,
        created: table.created,
        referenceIdLock: table.referenceIdLock,
        referenceId: table.referenceId,
        actionUserId: table.actionUserId,
        actionType: table.actionType,
        changes: table.changes,
      })
      .from(table)
      .where(eq(table.id, id))
      .limit(1);

    if (!audit[0]) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Audit record not found',
      });
    }

    const rawAudit = audit[0];
    const [actor, entityDisplayName, entityState] = await Promise.all([
      enrichAuditWithActor(context.db, rawAudit.actionUserId),
      getEntityDisplayName(
        context.db,
        entityType,
        rawAudit.referenceId,
        rawAudit.referenceIdLock
      ),
      getEntityCurrentState(context.db, entityType, rawAudit.referenceId),
    ]);

    const enrichedAudit: AuditRecord = {
      id: rawAudit.id,
      entityType,
      created: rawAudit.created,
      referenceIdLock: rawAudit.referenceIdLock,
      referenceId: rawAudit.referenceId,
      actionUserId: rawAudit.actionUserId,
      actionType: rawAudit.actionType,
      changes: normalizeChanges(rawAudit.changes),
      actor,
      entityDisplayName,
    };

    return {
      audit: enrichedAudit,
      entityState: {
        exists: entityState.exists,
        data: entityState.data,
        entityType,
        entityDisplayName,
      },
    };
  });

export const getEntityHistory = publicProcedure
  .input(AuditEntityHistoryInputSchema)
  .output(AuditListResponseSchema)
  .route({
    summary: 'Get complete audit history for an entity',
    tags: ['audits'],
    method: 'GET',
    path: '/audits/{entityType}/history/{referenceIdLock}',
  })
  .handler(async ({ input, context }) => {
    const { entityType, referenceIdLock, cursor, limit } = input;
    const table = AUDIT_TABLES[entityType];

    const conditions = [eq(table.referenceIdLock, referenceIdLock)];

    if (cursor !== undefined) {
      conditions.push(lt(table.id, cursor));
    }

    const results = await context.db
      .select({
        id: table.id,
        created: table.created,
        referenceIdLock: table.referenceIdLock,
        referenceId: table.referenceId,
        actionUserId: table.actionUserId,
        actionType: table.actionType,
        changes: table.changes,
      })
      .from(table)
      .where(and(...conditions))
      .orderBy(desc(table.id))
      .limit(limit + 1);

    const hasMore = results.length > limit;
    const auditsToReturn = results.slice(0, limit);

    const enrichedAudits = await enrichAudits(
      context.db,
      auditsToReturn.map((audit) => ({ audit, entityType }))
    );

    const nextCursor =
      hasMore && enrichedAudits.length > 0
        ? enrichedAudits[enrichedAudits.length - 1].id
        : null;

    return {
      audits: enrichedAudits,
      nextCursor,
      hasMore,
    };
  });

export const getEntityState = publicProcedure
  .input(GetEntityStateInputSchema)
  .output(AuditEntityStateSchema)
  .route({
    summary: 'Get current state of an entity by its ID',
    tags: ['audits'],
    method: 'GET',
    path: '/audits/entity-state/{entityType}/{referenceIdLock}',
  })
  .handler(async ({ input, context }) => {
    const { entityType, referenceIdLock } = input;

    const [entityState, entityDisplayName] = await Promise.all([
      getEntityCurrentState(context.db, entityType, referenceIdLock),
      getEntityDisplayName(
        context.db,
        entityType,
        referenceIdLock,
        referenceIdLock
      ),
    ]);

    return {
      exists: entityState.exists,
      data: entityState.data,
      entityType,
      entityDisplayName,
    };
  });

async function queryRecentlyAuditedEntities(
  db: DbClient,
  entityType: AuditEntityType,
  limit: number
): Promise<RecentlyAuditedEntity[]> {
  const table = AUDIT_TABLES[entityType];

  const results = await db
    .select({
      referenceIdLock: table.referenceIdLock,
      lastAuditDate: max(table.created),
      auditCount: count(),
    })
    .from(table)
    .groupBy(table.referenceIdLock)
    .orderBy(desc(max(table.created)))
    .limit(limit);

  const enriched = await Promise.all(
    results.map(async (row) => {
      const displayName = await getEntityDisplayName(
        db,
        entityType,
        row.referenceIdLock,
        row.referenceIdLock
      );
      return {
        referenceIdLock: row.referenceIdLock,
        entityDisplayName: displayName,
        lastAuditDate: row.lastAuditDate ?? new Date().toISOString(),
        auditCount: row.auditCount,
      };
    })
  );

  return enriched;
}

export const listRecentlyAuditedEntities = publicProcedure
  .input(ListRecentlyAuditedEntitiesInputSchema)
  .output(ListRecentlyAuditedEntitiesResponseSchema)
  .route({
    summary: 'List recently audited entities grouped by type',
    tags: ['audits'],
    method: 'GET',
    path: '/audits/recent-entities',
  })
  .handler(async ({ input, context }) => {
    const { limit } = input;

    const [tournaments, matches, games, scores] = await Promise.all([
      queryRecentlyAuditedEntities(
        context.db,
        ReportEntityType.Tournament,
        limit
      ),
      queryRecentlyAuditedEntities(context.db, ReportEntityType.Match, limit),
      queryRecentlyAuditedEntities(context.db, ReportEntityType.Game, limit),
      queryRecentlyAuditedEntities(context.db, ReportEntityType.Score, limit),
    ]);

    return {
      tournaments,
      matches,
      games,
      scores,
    };
  });

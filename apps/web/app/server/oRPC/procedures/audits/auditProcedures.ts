import { ORPCError } from '@orpc/server';
import {
  and,
  desc,
  asc,
  eq,
  isNotNull,
  lt,
  gt,
  count,
  max,
  sql,
} from 'drizzle-orm';

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
  TournamentAuditListInputSchema,
  TournamentAuditListResponseSchema,
  TournamentTimelineInputSchema,
  TournamentTimelineResponseSchema,
  FilterOptionsResponseSchema,
  TournamentTimelineAudit,
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

type PropertyFilter = { property: string; entityType: number };

function buildEntityPropertyFilter(
  changedProperties: PropertyFilter[] | undefined,
  entityType: number
): { variants: string[]; hasPropForEntity: boolean } {
  if (!changedProperties || changedProperties.length === 0) {
    return { variants: [], hasPropForEntity: false };
  }

  const propsForEntity = changedProperties.filter(
    (p) => p.entityType === entityType
  );
  if (propsForEntity.length === 0) {
    return { variants: [], hasPropForEntity: false };
  }

  const allVariants: string[] = [];
  for (const { property } of propsForEntity) {
    allVariants.push(property);
    const pascalCase = property.charAt(0).toUpperCase() + property.slice(1);
    if (pascalCase !== property) {
      allVariants.push(pascalCase);
    }
  }
  return { variants: allVariants, hasPropForEntity: true };
}

export const listTournamentsWithAuditSummary = publicProcedure
  .input(TournamentAuditListInputSchema)
  .output(TournamentAuditListResponseSchema)
  .route({
    summary: 'List tournaments with aggregated audit counts',
    tags: ['audits'],
    method: 'GET',
    path: '/audits/tournaments',
  })
  .handler(async ({ input, context }) => {
    const {
      cursor,
      limit,
      searchQuery,
      changedProperties,
      userActionsOnly,
      actionUserId,
      activityAfter,
      activityBefore,
    } = input;

    const db = context.db;

    const tournamentProps = buildEntityPropertyFilter(
      changedProperties,
      ReportEntityType.Tournament
    );
    const matchProps = buildEntityPropertyFilter(
      changedProperties,
      ReportEntityType.Match
    );
    const gameProps = buildEntityPropertyFilter(
      changedProperties,
      ReportEntityType.Game
    );
    const scoreProps = buildEntityPropertyFilter(
      changedProperties,
      ReportEntityType.Score
    );

    const hasAnyPropertyFilter =
      tournamentProps.hasPropForEntity ||
      matchProps.hasPropForEntity ||
      gameProps.hasPropForEntity ||
      scoreProps.hasPropForEntity;

    const buildPropertyCondition = (
      variants: string[],
      hasProp: boolean,
      hasAnyFilter: boolean
    ) => {
      if (!hasAnyFilter) return sql`TRUE`;
      if (!hasProp) return sql`FALSE`;
      return sql`changes ?| ARRAY[${sql.join(
        variants.map((v) => sql`${v}`),
        sql`, `
      )}]`;
    };

    const tournamentPropCond = buildPropertyCondition(
      tournamentProps.variants,
      tournamentProps.hasPropForEntity,
      hasAnyPropertyFilter
    );
    const matchPropCond = buildPropertyCondition(
      matchProps.variants,
      matchProps.hasPropForEntity,
      hasAnyPropertyFilter
    );
    const gamePropCond = buildPropertyCondition(
      gameProps.variants,
      gameProps.hasPropForEntity,
      hasAnyPropertyFilter
    );
    const scorePropCond = buildPropertyCondition(
      scoreProps.variants,
      scoreProps.hasPropForEntity,
      hasAnyPropertyFilter
    );

    const userFilterCond = userActionsOnly
      ? sql`action_user_id IS NOT NULL`
      : sql`TRUE`;
    const actionUserIdCond =
      actionUserId !== undefined
        ? sql`action_user_id = ${actionUserId}`
        : sql`TRUE`;
    const activityAfterCond = activityAfter
      ? sql`created >= ${activityAfter}`
      : sql`TRUE`;
    const activityBeforeCond = activityBefore
      ? sql`created <= ${activityBefore}`
      : sql`TRUE`;

    const baseFilters = sql`
      action_type != 0
      AND ${userFilterCond}
      AND ${actionUserIdCond}
      AND ${activityAfterCond}
      AND ${activityBeforeCond}
    `;

    const searchCond = searchQuery
      ? sql`(t.name ILIKE ${'%' + searchQuery + '%'} OR t.abbreviation ILIKE ${'%' + searchQuery + '%'})`
      : sql`TRUE`;
    const cursorCond = cursor ? sql`t.id < ${cursor}` : sql`TRUE`;

    const query = sql`
      WITH filtered_audits AS (
        SELECT 0 AS entity_type, reference_id_lock AS tournament_id, created
        FROM tournament_audits
        WHERE ${baseFilters} AND ${tournamentPropCond}

        UNION ALL

        SELECT 1 AS entity_type, m.tournament_id, ma.created
        FROM match_audits ma
        JOIN matches m ON ma.reference_id_lock = m.id
        WHERE ma.action_type != 0
          AND ${userActionsOnly ? sql`ma.action_user_id IS NOT NULL` : sql`TRUE`}
          AND ${actionUserId !== undefined ? sql`ma.action_user_id = ${actionUserId}` : sql`TRUE`}
          AND ${activityAfter ? sql`ma.created >= ${activityAfter}` : sql`TRUE`}
          AND ${activityBefore ? sql`ma.created <= ${activityBefore}` : sql`TRUE`}
          AND ${matchPropCond}

        UNION ALL

        SELECT 2 AS entity_type, m.tournament_id, ga.created
        FROM game_audits ga
        JOIN games g ON ga.reference_id_lock = g.id
        JOIN matches m ON g.match_id = m.id
        WHERE ga.action_type != 0
          AND ${userActionsOnly ? sql`ga.action_user_id IS NOT NULL` : sql`TRUE`}
          AND ${actionUserId !== undefined ? sql`ga.action_user_id = ${actionUserId}` : sql`TRUE`}
          AND ${activityAfter ? sql`ga.created >= ${activityAfter}` : sql`TRUE`}
          AND ${activityBefore ? sql`ga.created <= ${activityBefore}` : sql`TRUE`}
          AND ${gamePropCond}

        UNION ALL

        SELECT 3 AS entity_type, m.tournament_id, sa.created
        FROM game_score_audits sa
        JOIN game_scores gs ON sa.reference_id_lock = gs.id
        JOIN games g ON gs.game_id = g.id
        JOIN matches m ON g.match_id = m.id
        WHERE sa.action_type != 0
          AND ${userActionsOnly ? sql`sa.action_user_id IS NOT NULL` : sql`TRUE`}
          AND ${actionUserId !== undefined ? sql`sa.action_user_id = ${actionUserId}` : sql`TRUE`}
          AND ${activityAfter ? sql`sa.created >= ${activityAfter}` : sql`TRUE`}
          AND ${activityBefore ? sql`sa.created <= ${activityBefore}` : sql`TRUE`}
          AND ${scorePropCond}
      ),
      tournament_summary AS (
        SELECT
          tournament_id,
          COUNT(*) FILTER (WHERE entity_type = 0) AS tournament_changes,
          COUNT(*) FILTER (WHERE entity_type = 1) AS match_changes,
          COUNT(*) FILTER (WHERE entity_type = 2) AS game_changes,
          COUNT(*) FILTER (WHERE entity_type = 3) AS score_changes,
          MAX(created) AS last_activity
        FROM filtered_audits
        GROUP BY tournament_id
      )
      SELECT
        t.id,
        t.name,
        t.abbreviation,
        COALESCE(ts.tournament_changes, 0)::int AS tournament_changes,
        COALESCE(ts.match_changes, 0)::int AS match_changes,
        COALESCE(ts.game_changes, 0)::int AS game_changes,
        COALESCE(ts.score_changes, 0)::int AS score_changes,
        COALESCE(ts.last_activity::text, NOW()::text) AS last_activity
      FROM tournaments t
      JOIN tournament_summary ts ON t.id = ts.tournament_id
      WHERE ${searchCond} AND ${cursorCond}
      ORDER BY t.id DESC
      LIMIT ${limit + 1}
    `;

    const results = await db.execute(query);
    const rows = results.rows as Array<{
      id: number;
      name: string;
      abbreviation: string | null;
      tournament_changes: number;
      match_changes: number;
      game_changes: number;
      score_changes: number;
      last_activity: string;
    }>;

    const hasMore = rows.length > limit;
    const tournamentsToReturn = rows.slice(0, limit);

    const summaries = tournamentsToReturn.map((row) => ({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      tournamentChanges: row.tournament_changes,
      matchChanges: row.match_changes,
      gameChanges: row.game_changes,
      scoreChanges: row.score_changes,
      lastActivity: row.last_activity,
    }));

    const nextCursor =
      hasMore && summaries.length > 0
        ? summaries[summaries.length - 1].id
        : null;

    return {
      tournaments: summaries,
      nextCursor,
      hasMore,
    };
  });

export const getTournamentAuditTimeline = publicProcedure
  .input(TournamentTimelineInputSchema)
  .output(TournamentTimelineResponseSchema)
  .route({
    summary: 'Get chronological audit timeline for a tournament',
    tags: ['audits'],
    method: 'GET',
    path: '/audits/tournaments/{tournamentId}/timeline',
  })
  .handler(async ({ input, context }) => {
    const { tournamentId, cursor, limit, changedProperties } = input;

    const db = context.db;

    const tournamentProps = buildEntityPropertyFilter(
      changedProperties,
      ReportEntityType.Tournament
    );
    const matchProps = buildEntityPropertyFilter(
      changedProperties,
      ReportEntityType.Match
    );
    const gameProps = buildEntityPropertyFilter(
      changedProperties,
      ReportEntityType.Game
    );
    const scoreProps = buildEntityPropertyFilter(
      changedProperties,
      ReportEntityType.Score
    );

    const hasAnyPropertyFilter =
      tournamentProps.hasPropForEntity ||
      matchProps.hasPropForEntity ||
      gameProps.hasPropForEntity ||
      scoreProps.hasPropForEntity;

    const buildPropertyCondition = (
      variants: string[],
      hasProp: boolean,
      hasAnyFilter: boolean
    ) => {
      if (!hasAnyFilter) return sql`TRUE`;
      if (!hasProp) return sql`FALSE`;
      return sql`changes ?| ARRAY[${sql.join(
        variants.map((v) => sql`${v}`),
        sql`, `
      )}]`;
    };

    const tournamentPropCond = buildPropertyCondition(
      tournamentProps.variants,
      tournamentProps.hasPropForEntity,
      hasAnyPropertyFilter
    );
    const matchPropCond = buildPropertyCondition(
      matchProps.variants,
      matchProps.hasPropForEntity,
      hasAnyPropertyFilter
    );
    const gamePropCond = buildPropertyCondition(
      gameProps.variants,
      gameProps.hasPropForEntity,
      hasAnyPropertyFilter
    );
    const scorePropCond = buildPropertyCondition(
      scoreProps.variants,
      scoreProps.hasPropForEntity,
      hasAnyPropertyFilter
    );

    const cursorCond = cursor ? sql`id < ${cursor}` : sql`TRUE`;

    const query = sql`
      WITH all_audits AS (
        SELECT
          ta.id,
          0 AS entity_type,
          ta.created,
          ta.reference_id_lock,
          ta.reference_id,
          ta.action_user_id,
          ta.action_type,
          ta.changes,
          NULL::int AS parent_entity_id
        FROM tournament_audits ta
        WHERE ta.reference_id_lock = ${tournamentId}
          AND ta.action_type != 0
          AND ${tournamentPropCond}

        UNION ALL

        SELECT
          ma.id,
          1 AS entity_type,
          ma.created,
          ma.reference_id_lock,
          ma.reference_id,
          ma.action_user_id,
          ma.action_type,
          ma.changes,
          ${tournamentId}::int AS parent_entity_id
        FROM match_audits ma
        JOIN matches m ON ma.reference_id_lock = m.id
        WHERE m.tournament_id = ${tournamentId}
          AND ma.action_type != 0
          AND ${matchPropCond}

        UNION ALL

        SELECT
          ga.id,
          2 AS entity_type,
          ga.created,
          ga.reference_id_lock,
          ga.reference_id,
          ga.action_user_id,
          ga.action_type,
          ga.changes,
          g.match_id AS parent_entity_id
        FROM game_audits ga
        JOIN games g ON ga.reference_id_lock = g.id
        JOIN matches m ON g.match_id = m.id
        WHERE m.tournament_id = ${tournamentId}
          AND ga.action_type != 0
          AND ${gamePropCond}

        UNION ALL

        SELECT
          sa.id,
          3 AS entity_type,
          sa.created,
          sa.reference_id_lock,
          sa.reference_id,
          sa.action_user_id,
          sa.action_type,
          sa.changes,
          gs.game_id AS parent_entity_id
        FROM game_score_audits sa
        JOIN game_scores gs ON sa.reference_id_lock = gs.id
        JOIN games g ON gs.game_id = g.id
        JOIN matches m ON g.match_id = m.id
        WHERE m.tournament_id = ${tournamentId}
          AND sa.action_type != 0
          AND ${scorePropCond}
      )
      SELECT *
      FROM all_audits
      WHERE ${cursorCond}
      ORDER BY id DESC
      LIMIT ${limit + 1}
    `;

    const results = await db.execute(query);
    const rows = results.rows as Array<{
      id: number;
      entity_type: number;
      created: string;
      reference_id_lock: number;
      reference_id: number | null;
      action_user_id: number | null;
      action_type: number;
      changes: unknown;
      parent_entity_id: number | null;
    }>;

    const hasMore = rows.length > limit;
    const auditsToReturn = rows.slice(0, limit);

    const enrichedAudits: TournamentTimelineAudit[] = await Promise.all(
      auditsToReturn.map(async (row) => {
        const entityType = row.entity_type as AuditEntityType;
        const [actor, entityDisplayName, parentEntityName] = await Promise.all([
          enrichAuditWithActor(db, row.action_user_id),
          getEntityDisplayName(
            db,
            entityType,
            row.reference_id,
            row.reference_id_lock
          ),
          row.parent_entity_id
            ? getEntityDisplayName(
                db,
                entityType === ReportEntityType.Match
                  ? ReportEntityType.Tournament
                  : entityType === ReportEntityType.Game
                    ? ReportEntityType.Match
                    : ReportEntityType.Game,
                row.parent_entity_id,
                row.parent_entity_id
              )
            : null,
        ]);

        return {
          id: row.id,
          entityType,
          created: row.created,
          referenceIdLock: row.reference_id_lock,
          referenceId: row.reference_id,
          actionUserId: row.action_user_id,
          actionType: row.action_type,
          changes: normalizeChanges(row.changes),
          actor,
          entityDisplayName,
          parentEntityId: row.parent_entity_id,
          parentEntityName,
        };
      })
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

export const getFilterOptions = publicProcedure
  .output(FilterOptionsResponseSchema)
  .route({
    summary: 'Get available filter options for audit properties',
    tags: ['audits'],
    method: 'GET',
    path: '/audits/filter-options',
  })
  .handler(async ({ context }) => {
    const db = context.db;

    const propertySet = new Set<string>();
    const propertyEntityMap = new Map<string, AuditEntityType>();

    const extractProperties = async (
      table: typeof schema.tournamentAudits,
      entityType: AuditEntityType
    ) => {
      const audits = await db
        .select({ changes: table.changes })
        .from(table)
        .where(isNotNull(table.changes))
        .limit(500);

      for (const audit of audits) {
        if (audit.changes && typeof audit.changes === 'object') {
          const changes = audit.changes as Record<string, unknown>;
          for (const key of Object.keys(changes)) {
            const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
            if (!propertySet.has(normalizedKey)) {
              propertySet.add(normalizedKey);
              propertyEntityMap.set(normalizedKey, entityType);
            }
          }
        }
      }
    };

    await Promise.all([
      extractProperties(schema.tournamentAudits, ReportEntityType.Tournament),
      extractProperties(
        schema.matchAudits as unknown as typeof schema.tournamentAudits,
        ReportEntityType.Match
      ),
      extractProperties(
        schema.gameAudits as unknown as typeof schema.tournamentAudits,
        ReportEntityType.Game
      ),
      extractProperties(
        schema.gameScoreAudits as unknown as typeof schema.tournamentAudits,
        ReportEntityType.Score
      ),
    ]);

    const properties = Array.from(propertySet)
      .map((name) => ({
        name,
        entityType: propertyEntityMap.get(name)!,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { properties };
  });

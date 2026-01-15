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
  inArray,
  ilike,
  gte,
  lte,
  or,
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
      userActionsOnly,
      actionUserId,
      activityAfter,
      activityBefore,
    } = input;

    const db = context.db;

    const tournamentIds = await db
      .selectDistinct({ id: schema.tournaments.id })
      .from(schema.tournaments)
      .innerJoin(
        schema.tournamentAudits,
        eq(schema.tournamentAudits.referenceIdLock, schema.tournaments.id)
      );

    const tournamentsWithMatchAudits = await db
      .selectDistinct({ id: schema.tournaments.id })
      .from(schema.tournaments)
      .innerJoin(
        schema.matches,
        eq(schema.matches.tournamentId, schema.tournaments.id)
      )
      .innerJoin(
        schema.matchAudits,
        eq(schema.matchAudits.referenceIdLock, schema.matches.id)
      );

    const tournamentsWithGameAudits = await db
      .selectDistinct({ id: schema.tournaments.id })
      .from(schema.tournaments)
      .innerJoin(
        schema.matches,
        eq(schema.matches.tournamentId, schema.tournaments.id)
      )
      .innerJoin(schema.games, eq(schema.games.matchId, schema.matches.id))
      .innerJoin(
        schema.gameAudits,
        eq(schema.gameAudits.referenceIdLock, schema.games.id)
      );

    const tournamentsWithScoreAudits = await db
      .selectDistinct({ id: schema.tournaments.id })
      .from(schema.tournaments)
      .innerJoin(
        schema.matches,
        eq(schema.matches.tournamentId, schema.tournaments.id)
      )
      .innerJoin(schema.games, eq(schema.games.matchId, schema.matches.id))
      .innerJoin(
        schema.gameScores,
        eq(schema.gameScores.gameId, schema.games.id)
      )
      .innerJoin(
        schema.gameScoreAudits,
        eq(schema.gameScoreAudits.referenceIdLock, schema.gameScores.id)
      );

    const allTournamentIdsWithAudits = new Set([
      ...tournamentIds.map((t) => t.id),
      ...tournamentsWithMatchAudits.map((t) => t.id),
      ...tournamentsWithGameAudits.map((t) => t.id),
      ...tournamentsWithScoreAudits.map((t) => t.id),
    ]);

    if (allTournamentIdsWithAudits.size === 0) {
      return { tournaments: [], nextCursor: null, hasMore: false };
    }

    const tournamentIdsArray = Array.from(allTournamentIdsWithAudits);
    const conditions = [inArray(schema.tournaments.id, tournamentIdsArray)];

    if (searchQuery) {
      conditions.push(
        or(
          ilike(schema.tournaments.name, `%${searchQuery}%`),
          ilike(schema.tournaments.abbreviation, `%${searchQuery}%`)
        )!
      );
    }

    if (cursor) {
      conditions.push(lt(schema.tournaments.id, cursor));
    }

    const tournamentsResult = await db
      .select({
        id: schema.tournaments.id,
        name: schema.tournaments.name,
        abbreviation: schema.tournaments.abbreviation,
      })
      .from(schema.tournaments)
      .where(and(...conditions))
      .orderBy(desc(schema.tournaments.id))
      .limit(limit + 1);

    const hasMore = tournamentsResult.length > limit;
    const tournamentsToReturn = tournamentsResult.slice(0, limit);

    const summaries = await Promise.all(
      tournamentsToReturn.map(async (tournament) => {
        const matchIdsForTournament = await db
          .select({ id: schema.matches.id })
          .from(schema.matches)
          .where(eq(schema.matches.tournamentId, tournament.id));

        const gameIdsForTournament =
          matchIdsForTournament.length > 0
            ? await db
                .select({ id: schema.games.id })
                .from(schema.games)
                .where(
                  inArray(
                    schema.games.matchId,
                    matchIdsForTournament.map((m) => m.id)
                  )
                )
            : [];

        const scoreIdsForTournament =
          gameIdsForTournament.length > 0
            ? await db
                .select({ id: schema.gameScores.id })
                .from(schema.gameScores)
                .where(
                  inArray(
                    schema.gameScores.gameId,
                    gameIdsForTournament.map((g) => g.id)
                  )
                )
            : [];

        const baseConditions = (
          table: typeof schema.tournamentAudits,
          entityIds: number[]
        ) => {
          const conds = [];
          if (entityIds.length > 0) {
            conds.push(inArray(table.referenceIdLock, entityIds));
          } else {
            conds.push(sql`false`);
          }
          if (userActionsOnly) {
            conds.push(isNotNull(table.actionUserId));
          }
          if (actionUserId !== undefined) {
            conds.push(eq(table.actionUserId, actionUserId));
          }
          if (activityAfter) {
            conds.push(gte(table.created, activityAfter));
          }
          if (activityBefore) {
            conds.push(lte(table.created, activityBefore));
          }
          return conds;
        };

        const [tournamentAuditCount] = await db
          .select({ count: count() })
          .from(schema.tournamentAudits)
          .where(
            and(...baseConditions(schema.tournamentAudits, [tournament.id]))
          );

        const [matchAuditCount] =
          matchIdsForTournament.length > 0
            ? await db
                .select({ count: count() })
                .from(schema.matchAudits)
                .where(
                  and(
                    ...baseConditions(
                      schema.matchAudits as unknown as unknown as typeof schema.tournamentAudits,
                      matchIdsForTournament.map((m) => m.id)
                    )
                  )
                )
            : [{ count: 0 }];

        const [gameAuditCount] =
          gameIdsForTournament.length > 0
            ? await db
                .select({ count: count() })
                .from(schema.gameAudits)
                .where(
                  and(
                    ...baseConditions(
                      schema.gameAudits as unknown as unknown as typeof schema.tournamentAudits,
                      gameIdsForTournament.map((g) => g.id)
                    )
                  )
                )
            : [{ count: 0 }];

        const [scoreAuditCount] =
          scoreIdsForTournament.length > 0
            ? await db
                .select({ count: count() })
                .from(schema.gameScoreAudits)
                .where(
                  and(
                    ...baseConditions(
                      schema.gameScoreAudits as unknown as unknown as typeof schema.tournamentAudits,
                      scoreIdsForTournament.map((s) => s.id)
                    )
                  )
                )
            : [{ count: 0 }];

        const lastActivityResults = await Promise.all([
          db
            .select({ latest: max(schema.tournamentAudits.created) })
            .from(schema.tournamentAudits)
            .where(eq(schema.tournamentAudits.referenceIdLock, tournament.id)),
          matchIdsForTournament.length > 0
            ? db
                .select({ latest: max(schema.matchAudits.created) })
                .from(schema.matchAudits)
                .where(
                  inArray(
                    schema.matchAudits.referenceIdLock,
                    matchIdsForTournament.map((m) => m.id)
                  )
                )
            : [{ latest: null }],
          gameIdsForTournament.length > 0
            ? db
                .select({ latest: max(schema.gameAudits.created) })
                .from(schema.gameAudits)
                .where(
                  inArray(
                    schema.gameAudits.referenceIdLock,
                    gameIdsForTournament.map((g) => g.id)
                  )
                )
            : [{ latest: null }],
          scoreIdsForTournament.length > 0
            ? db
                .select({ latest: max(schema.gameScoreAudits.created) })
                .from(schema.gameScoreAudits)
                .where(
                  inArray(
                    schema.gameScoreAudits.referenceIdLock,
                    scoreIdsForTournament.map((s) => s.id)
                  )
                )
            : [{ latest: null }],
        ]);

        const latestDates = lastActivityResults
          .flat()
          .map((r) => r.latest)
          .filter(Boolean) as string[];

        const lastActivity =
          latestDates.length > 0
            ? latestDates.sort().reverse()[0]
            : new Date().toISOString();

        return {
          id: tournament.id,
          name: tournament.name,
          abbreviation: tournament.abbreviation,
          tournamentChanges: tournamentAuditCount?.count ?? 0,
          matchChanges: matchAuditCount?.count ?? 0,
          gameChanges: gameAuditCount?.count ?? 0,
          scoreChanges: scoreAuditCount?.count ?? 0,
          lastActivity,
        };
      })
    );

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
    const {
      tournamentId,
      cursor,
      limit,
      entityTypes,
      excludeSystemActions,
      excludeVerificationChanges,
      changedProperties,
      actionTypes,
    } = input;

    const db = context.db;

    const matchIds = await db
      .select({ id: schema.matches.id })
      .from(schema.matches)
      .where(eq(schema.matches.tournamentId, tournamentId));

    const gameIds =
      matchIds.length > 0
        ? await db
            .select({ id: schema.games.id, matchId: schema.games.matchId })
            .from(schema.games)
            .where(
              inArray(
                schema.games.matchId,
                matchIds.map((m) => m.id)
              )
            )
        : [];

    const scoreIds =
      gameIds.length > 0
        ? await db
            .select({
              id: schema.gameScores.id,
              gameId: schema.gameScores.gameId,
            })
            .from(schema.gameScores)
            .where(
              inArray(
                schema.gameScores.gameId,
                gameIds.map((g) => g.id)
              )
            )
        : [];

    const gameIdToMatchId = new Map(gameIds.map((g) => [g.id, g.matchId]));
    const scoreIdToGameId = new Map(scoreIds.map((s) => [s.id, s.gameId]));

    type TimelineAudit = RawAuditRow & {
      entityType: AuditEntityType;
      parentEntityId: number | null;
    };

    const allAudits: TimelineAudit[] = [];

    const shouldIncludeEntityType = (type: AuditEntityType) =>
      !entityTypes || entityTypes.length === 0 || entityTypes.includes(type);

    const buildConditions = (
      table: typeof schema.tournamentAudits,
      entityIds: number[]
    ) => {
      const conds = [];
      if (entityIds.length > 0) {
        conds.push(inArray(table.referenceIdLock, entityIds));
      } else {
        return null;
      }
      if (excludeSystemActions) {
        conds.push(isNotNull(table.actionUserId));
      }
      if (actionTypes && actionTypes.length > 0) {
        conds.push(inArray(table.actionType, actionTypes));
      }
      if (cursor) {
        conds.push(lt(table.id, cursor));
      }
      return conds;
    };

    if (shouldIncludeEntityType(ReportEntityType.Tournament)) {
      const conds = buildConditions(schema.tournamentAudits, [tournamentId]);
      if (conds) {
        const tournamentAudits = await db
          .select({
            id: schema.tournamentAudits.id,
            created: schema.tournamentAudits.created,
            referenceIdLock: schema.tournamentAudits.referenceIdLock,
            referenceId: schema.tournamentAudits.referenceId,
            actionUserId: schema.tournamentAudits.actionUserId,
            actionType: schema.tournamentAudits.actionType,
            changes: schema.tournamentAudits.changes,
          })
          .from(schema.tournamentAudits)
          .where(and(...conds))
          .orderBy(desc(schema.tournamentAudits.id))
          .limit(limit + 1);

        allAudits.push(
          ...tournamentAudits.map((a) => ({
            ...a,
            entityType: ReportEntityType.Tournament as AuditEntityType,
            parentEntityId: null,
          }))
        );
      }
    }

    if (
      shouldIncludeEntityType(ReportEntityType.Match) &&
      matchIds.length > 0
    ) {
      const conds = buildConditions(
        schema.matchAudits as unknown as typeof schema.tournamentAudits,
        matchIds.map((m) => m.id)
      );
      if (conds) {
        const matchAuditsResult = await db
          .select({
            id: schema.matchAudits.id,
            created: schema.matchAudits.created,
            referenceIdLock: schema.matchAudits.referenceIdLock,
            referenceId: schema.matchAudits.referenceId,
            actionUserId: schema.matchAudits.actionUserId,
            actionType: schema.matchAudits.actionType,
            changes: schema.matchAudits.changes,
          })
          .from(schema.matchAudits)
          .where(and(...conds))
          .orderBy(desc(schema.matchAudits.id))
          .limit(limit + 1);

        allAudits.push(
          ...matchAuditsResult.map((a) => ({
            ...a,
            entityType: ReportEntityType.Match as AuditEntityType,
            parentEntityId: tournamentId,
          }))
        );
      }
    }

    if (shouldIncludeEntityType(ReportEntityType.Game) && gameIds.length > 0) {
      const conds = buildConditions(
        schema.gameAudits as unknown as typeof schema.tournamentAudits,
        gameIds.map((g) => g.id)
      );
      if (conds) {
        const gameAuditsResult = await db
          .select({
            id: schema.gameAudits.id,
            created: schema.gameAudits.created,
            referenceIdLock: schema.gameAudits.referenceIdLock,
            referenceId: schema.gameAudits.referenceId,
            actionUserId: schema.gameAudits.actionUserId,
            actionType: schema.gameAudits.actionType,
            changes: schema.gameAudits.changes,
          })
          .from(schema.gameAudits)
          .where(and(...conds))
          .orderBy(desc(schema.gameAudits.id))
          .limit(limit + 1);

        allAudits.push(
          ...gameAuditsResult.map((a) => ({
            ...a,
            entityType: ReportEntityType.Game as AuditEntityType,
            parentEntityId: gameIdToMatchId.get(a.referenceIdLock) ?? null,
          }))
        );
      }
    }

    if (
      shouldIncludeEntityType(ReportEntityType.Score) &&
      scoreIds.length > 0
    ) {
      const conds = buildConditions(
        schema.gameScoreAudits as unknown as typeof schema.tournamentAudits,
        scoreIds.map((s) => s.id)
      );
      if (conds) {
        const scoreAuditsResult = await db
          .select({
            id: schema.gameScoreAudits.id,
            created: schema.gameScoreAudits.created,
            referenceIdLock: schema.gameScoreAudits.referenceIdLock,
            referenceId: schema.gameScoreAudits.referenceId,
            actionUserId: schema.gameScoreAudits.actionUserId,
            actionType: schema.gameScoreAudits.actionType,
            changes: schema.gameScoreAudits.changes,
          })
          .from(schema.gameScoreAudits)
          .where(and(...conds))
          .orderBy(desc(schema.gameScoreAudits.id))
          .limit(limit + 1);

        allAudits.push(
          ...scoreAuditsResult.map((a) => ({
            ...a,
            entityType: ReportEntityType.Score as AuditEntityType,
            parentEntityId: scoreIdToGameId.get(a.referenceIdLock) ?? null,
          }))
        );
      }
    }

    let filteredAudits = allAudits;

    if (excludeVerificationChanges) {
      filteredAudits = filteredAudits.filter((a) => {
        if (!a.changes || typeof a.changes !== 'object') return true;
        const changes = a.changes as Record<string, unknown>;
        const keys = Object.keys(changes);
        return !(
          keys.length === 1 &&
          (keys[0] === 'verificationStatus' || keys[0] === 'VerificationStatus')
        );
      });
    }

    if (changedProperties && changedProperties.length > 0) {
      const propsLower = changedProperties.map((p) => p.toLowerCase());
      filteredAudits = filteredAudits.filter((a) => {
        if (!a.changes || typeof a.changes !== 'object') return false;
        const changes = a.changes as Record<string, unknown>;
        const keys = Object.keys(changes).map((k) => k.toLowerCase());
        return propsLower.some((p) => keys.includes(p));
      });
    }

    filteredAudits.sort((a, b) => b.id - a.id);
    const hasMore = filteredAudits.length > limit;
    const auditsToReturn = filteredAudits.slice(0, limit);

    const enrichedAudits: TournamentTimelineAudit[] = await Promise.all(
      auditsToReturn.map(async (audit) => {
        const [actor, entityDisplayName, parentEntityName] = await Promise.all([
          enrichAuditWithActor(db, audit.actionUserId),
          getEntityDisplayName(
            db,
            audit.entityType,
            audit.referenceId,
            audit.referenceIdLock
          ),
          audit.parentEntityId
            ? getEntityDisplayName(
                db,
                audit.entityType === ReportEntityType.Match
                  ? ReportEntityType.Tournament
                  : audit.entityType === ReportEntityType.Game
                    ? ReportEntityType.Match
                    : ReportEntityType.Game,
                audit.parentEntityId,
                audit.parentEntityId
              )
            : null,
        ]);

        return {
          id: audit.id,
          entityType: audit.entityType,
          created: audit.created,
          referenceIdLock: audit.referenceIdLock,
          referenceId: audit.referenceId,
          actionUserId: audit.actionUserId,
          actionType: audit.actionType,
          changes: normalizeChanges(audit.changes),
          actor,
          entityDisplayName,
          parentEntityId: audit.parentEntityId,
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

    const propertyMap = new Map<
      string,
      { entityType: AuditEntityType; count: number }
    >();

    const extractProperties = async (
      table: typeof schema.tournamentAudits,
      entityType: AuditEntityType
    ) => {
      const audits = await db
        .select({ changes: table.changes })
        .from(table)
        .where(isNotNull(table.changes))
        .limit(1000);

      for (const audit of audits) {
        if (audit.changes && typeof audit.changes === 'object') {
          const changes = audit.changes as Record<string, unknown>;
          for (const key of Object.keys(changes)) {
            const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
            const existing = propertyMap.get(normalizedKey);
            if (existing) {
              existing.count++;
            } else {
              propertyMap.set(normalizedKey, { entityType, count: 1 });
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

    const properties = Array.from(propertyMap.entries())
      .map(([name, data]) => ({
        name,
        entityType: data.entityType,
        changeCount: data.count,
      }))
      .sort((a, b) => b.changeCount - a.changeCount);

    return { properties };
  });

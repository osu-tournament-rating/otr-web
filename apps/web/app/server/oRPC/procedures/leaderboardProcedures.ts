import { ORPCError } from '@orpc/server';
import { SQL, and, or, eq, gte, lte, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import {
  LeaderboardRequestSchema,
  LeaderboardResponseSchema,
  type LeaderboardRequest,
} from '@/lib/orpc/schema/leaderboard';
import { buildTierProgress, getTierBounds } from '@/lib/utils/tierProgress';
import { Ruleset } from '@otr/core/osu';

import { publicProcedure, protectedProcedure } from './base';
import type { DatabaseClient } from '@/lib/db';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// Internal shared implementation used by both public and protected procedures.
// `friendUserId` scopes the leaderboard to the signed-in user's friends when provided.
async function runLeaderboard({
  input,
  context,
  friendUserId,
}: {
  input: LeaderboardRequest;
  context: { db: DatabaseClient };
  friendUserId?: number;
}) {
  try {
    const page = Math.max(input.page ?? 1, 1);
    const pageSize = Math.max(
      1,
      Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
    );
    const ruleset = input.ruleset ?? Ruleset.Osu;

    const tournamentsPlayedExpr = sql<number>`
      COALESCE(COUNT(DISTINCT ${schema.tournaments.id})::int, 0)
    `.as('tournamentsPlayed');
    const matchesPlayedExpr = sql<number>`
      COALESCE(
        SUM(
          CASE
            WHEN ${schema.tournaments.id} IS NOT NULL THEN ${schema.playerTournamentStats.matchesPlayed}
            ELSE 0
          END
        )::int,
        0
      )
    `.as('matchesPlayed');
    const winRateExpr = sql<number>`
      CASE
        WHEN SUM(
          CASE
            WHEN ${schema.tournaments.id} IS NOT NULL THEN ${schema.playerTournamentStats.matchesPlayed}
            ELSE 0
          END
        ) = 0 THEN 0
        ELSE SUM(
          CASE
            WHEN ${schema.tournaments.id} IS NOT NULL THEN ${schema.playerTournamentStats.matchesWon}
            ELSE 0
          END
        )::double precision
        / NULLIF(
          SUM(
            CASE
              WHEN ${schema.tournaments.id} IS NOT NULL THEN ${schema.playerTournamentStats.matchesPlayed}
              ELSE 0
            END
          )::double precision,
          0
        )
      END
    `.as('winRate');
    const osuGlobalRankExpr = sql<number | null>`
      ${schema.playerOsuRulesetData.globalRank}
    `.as('osuGlobalRank');

    const selectFields = {
      playerId: schema.players.id,
      osuId: schema.players.osuId,
      username: schema.players.username,
      country: schema.players.country,
      rating: schema.playerRatings.rating,
      volatility: schema.playerRatings.volatility,
      percentile: schema.playerRatings.percentile,
      ratingGlobalRank: schema.playerRatings.globalRank,
      countryRank: schema.playerRatings.countryRank,
      tournamentsPlayed: tournamentsPlayedExpr,
      matchesPlayed: matchesPlayedExpr,
      winRate: winRateExpr,
      osuGlobalRank: osuGlobalRankExpr,
    } as const;

    let leaderboardBaseQuery = friendUserId
      ? context.db
          .select(selectFields)
          .from(schema.playerRatings)
          .innerJoin(
            schema.players,
            eq(schema.playerRatings.playerId, schema.players.id)
          )
          .leftJoin(
            schema.playerFriends,
            eq(schema.playerFriends.friendId, schema.players.id)
          )
      : context.db
          .select(selectFields)
          .from(schema.playerRatings)
          .innerJoin(
            schema.players,
            eq(schema.playerRatings.playerId, schema.players.id)
          );

    leaderboardBaseQuery = leaderboardBaseQuery
      .leftJoin(
        schema.playerTournamentStats,
        eq(schema.playerTournamentStats.playerId, schema.players.id)
      )
      .leftJoin(
        schema.tournaments,
        and(
          eq(schema.tournaments.id, schema.playerTournamentStats.tournamentId),
          eq(schema.tournaments.ruleset, schema.playerRatings.ruleset)
        )
      )
      .leftJoin(
        schema.playerOsuRulesetData,
        and(
          eq(schema.playerOsuRulesetData.playerId, schema.players.id),
          eq(schema.playerOsuRulesetData.ruleset, schema.playerRatings.ruleset)
        )
      );

    const ratingRulesetFilter = eq(schema.playerRatings.ruleset, ruleset);
    const playerScopeFilter = friendUserId
      ? or(
          eq(schema.playerFriends.playerId, friendUserId),
          eq(schema.players.id, friendUserId)
        )
      : undefined;
    const baseWhere = playerScopeFilter
      ? and(playerScopeFilter, ratingRulesetFilter)
      : ratingRulesetFilter;
    const groupByColumns = [
      schema.playerRatings.id,
      schema.playerRatings.rating,
      schema.playerRatings.volatility,
      schema.playerRatings.percentile,
      schema.playerRatings.globalRank,
      schema.playerRatings.countryRank,
      schema.players.id,
      schema.players.osuId,
      schema.players.username,
      schema.players.country,
      schema.playerOsuRulesetData.globalRank,
    ] as const;

    const leaderboardBase = context.db
      .$with('leaderboard_base')
      .as(leaderboardBaseQuery.where(baseWhere).groupBy(...groupByColumns));

    const filters: SQL<unknown>[] = [];

    if (input.country) {
      filters.push(eq(leaderboardBase.country, input.country));
    }

    if (input.minRating !== undefined) {
      filters.push(gte(leaderboardBase.rating, input.minRating));
    }

    if (input.maxRating !== undefined) {
      filters.push(lte(leaderboardBase.rating, input.maxRating));
    }

    if (input.minMatches !== undefined) {
      filters.push(gte(leaderboardBase.matchesPlayed, input.minMatches));
    }

    if (input.maxMatches !== undefined) {
      filters.push(lte(leaderboardBase.matchesPlayed, input.maxMatches));
    }

    if (input.minWinRate !== undefined) {
      filters.push(gte(leaderboardBase.winRate, input.minWinRate));
    }

    if (input.maxWinRate !== undefined) {
      filters.push(lte(leaderboardBase.winRate, input.maxWinRate));
    }

    if (input.minOsuRank !== undefined) {
      filters.push(
        sql`${leaderboardBase.osuGlobalRank} IS NOT NULL AND ${leaderboardBase.osuGlobalRank} >= ${input.minOsuRank}`
      );
    }

    if (input.maxOsuRank !== undefined) {
      filters.push(
        sql`${leaderboardBase.osuGlobalRank} IS NOT NULL AND ${leaderboardBase.osuGlobalRank} <= ${input.maxOsuRank}`
      );
    }

    if (input.tiers && input.tiers.length > 0) {
      const tierConditions = input.tiers
        .map((tierKey) => {
          const bounds = getTierBounds(tierKey);

          if (!bounds) {
            return undefined;
          }

          const lowerBound = sql`${leaderboardBase.rating} >= ${bounds.min}`;

          if (bounds.max === null) {
            return lowerBound;
          }

          const upperBound = sql`${leaderboardBase.rating} < ${bounds.max}`;
          return sql`${lowerBound} AND ${upperBound}`;
        })
        .filter(
          (condition): condition is SQL<unknown> => condition !== undefined
        );

      if (tierConditions.length === 1) {
        filters.push(tierConditions[0]!);
      } else if (tierConditions.length > 1) {
        const combined = tierConditions.reduce((acc, condition) =>
          acc ? sql`(${acc}) OR (${condition})` : condition
        );

        if (combined) {
          filters.push(combined);
        }
      }
    }

    const whereClause =
      filters.length === 1
        ? filters[0]
        : filters.length > 1
          ? and(...filters)
          : undefined;

    const baseCountQuery = context.db
      .with(leaderboardBase)
      .select({ value: sql<number>`COUNT(*)` })
      .from(leaderboardBase);

    const totalRows = whereClause
      ? await baseCountQuery.where(whereClause)
      : await baseCountQuery;
    const total = Number(totalRows[0]?.value ?? 0);
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const currentPage = Math.min(page, pages);
    const offset = Math.max(0, (currentPage - 1) * pageSize);

    const baseRowsQuery = context.db
      .with(leaderboardBase)
      .select({
        playerId: leaderboardBase.playerId,
        osuId: leaderboardBase.osuId,
        username: leaderboardBase.username,
        country: leaderboardBase.country,
        rating: leaderboardBase.rating,
        volatility: leaderboardBase.volatility,
        percentile: leaderboardBase.percentile,
        ratingGlobalRank: leaderboardBase.ratingGlobalRank,
        countryRank: leaderboardBase.countryRank,
        tournamentsPlayed: leaderboardBase.tournamentsPlayed,
        matchesPlayed: leaderboardBase.matchesPlayed,
        winRate: leaderboardBase.winRate,
      })
      .from(leaderboardBase);

    const rowsQuery = whereClause
      ? baseRowsQuery.where(whereClause)
      : baseRowsQuery;

    const leaderboardRows = await rowsQuery
      .orderBy(leaderboardBase.ratingGlobalRank)
      .limit(pageSize)
      .offset(offset);

    const leaderboard = leaderboardRows.map((row) => {
      const rating = Number(row.rating ?? 0);
      const { tierKey, tierProgress } = buildTierProgress(rating);

      const winRate = Number(row.winRate ?? 0);

      return {
        player: {
          id: Number(row.playerId),
          osuId: Number(row.osuId),
          username: row.username,
          country: row.country,
        },
        ruleset,
        rating,
        volatility: Number(row.volatility ?? 0),
        percentile: Number(row.percentile ?? 0),
        globalRank: Number(row.ratingGlobalRank ?? 0),
        countryRank: Number(row.countryRank ?? 0),
        tournamentsPlayed: Number(row.tournamentsPlayed ?? 0),
        matchesPlayed: Number(row.matchesPlayed ?? 0),
        winRate: Number.isFinite(winRate) && winRate >= 0 ? winRate : 0,
        tier: tierKey,
        tierProgress,
      };
    });

    return LeaderboardResponseSchema.parse({
      page: currentPage,
      pageSize,
      pages,
      total,
      ruleset,
      leaderboard,
    });
  } catch (error) {
    console.error('[orpc] leaderboard.list failed', error);
    throw new ORPCError('INTERNAL_SERVER_ERROR', {
      message:
        error instanceof Error
          ? error.message
          : 'Failed to fetch leaderboard data',
    });
  }
}

// Public: global leaderboard only. Does NOT expose friends scope.
export const getLeaderboard = publicProcedure
  .input(LeaderboardRequestSchema.omit({ friend: true, userId: true }))
  .output(LeaderboardResponseSchema)
  .route({
    summary: 'List leaderboard entries',
    tags: ['public'],
    method: 'GET',
    path: '/leaderboard',
  })
  .handler(async ({ input, context }) =>
    runLeaderboard({ input, context, friendUserId: undefined })
  );

// Protected: leaderboard scoped to the signed-in user's friends.
export const getLeaderboardFriends = protectedProcedure
  .input(LeaderboardRequestSchema.omit({ friend: true, userId: true }))
  .output(LeaderboardResponseSchema)
  .route({
    summary: "List leaderboard entries for user's friends",
    tags: ['protected'],
    method: 'GET',
    path: '/leaderboard/friends',
  })
  .handler(async ({ input, context }) => {
    // The protected procedure ensures session is present.
    const session = context.session as
      | { dbPlayer?: { id?: number | null } | null }
      | undefined;
    const friendUserId = session?.dbPlayer?.id;

    if (!friendUserId) {
      throw new ORPCError('UNAUTHORIZED', {
        message: 'Invalid or missing session',
      });
    }

    return runLeaderboard({ input, context, friendUserId });
  });

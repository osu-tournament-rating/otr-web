import { ORPCError, os } from '@orpc/server';
import { db } from '@/lib/db';
import { SQL, and, eq, gte, lte, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { auth } from '@/lib/auth/auth';
import { z } from 'zod';
import {
  LeaderboardRequestSchema,
  LeaderboardResponseSchema,
  LeaderboardTierKey,
} from '@/lib/orpc/schema/leaderboard';
import { tierData, type TierName } from '@/lib/utils/tierData';

// Base procedure with context
const base = os.$context<{
  headers: Headers;
}>();

// Database middleware - manages DB connection lifecycle
const withDatabase = base.middleware(async ({ context, next }) => {
  return next({
    context: {
      ...context,
      db,
    },
  });
});

// Auth middleware using better-auth
const withAuth = base.middleware(async ({ context, next }) => {
  // Validate session with better-auth
  const session = await auth.api.getSession({ headers: context.headers });

  if (!session) {
    throw new ORPCError('UNAUTHORIZED', {
      message: 'Invalid or expired session',
    });
  }

  return next({
    context: {
      ...context,
      session,
    },
  });
});

// Reusable procedure bases
export const publicProcedure = base.use(withDatabase);
export const protectedProcedure = base.use(withDatabase).use(withAuth);

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const SUB_TIERS = 3;

const tierKeyOrder: LeaderboardTierKey[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'eliteGrandmaster',
];

const tierKeyToName: Record<LeaderboardTierKey, TierName> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
  emerald: 'Emerald',
  diamond: 'Diamond',
  master: 'Master',
  grandmaster: 'Grandmaster',
  eliteGrandmaster: 'Elite Grandmaster',
};

const tierBounds: Record<
  LeaderboardTierKey,
  { min: number; max: number | null }
> = tierKeyOrder.reduce(
  (bounds, tierKey, index) => {
    const tierName = tierKeyToName[tierKey];
    const currentTier = tierData.find((tier) => tier.tier === tierName);
    const nextTierKey = tierKeyOrder[index + 1];

    if (!currentTier) {
      return bounds;
    }

    const nextTier = nextTierKey
      ? tierData.find((tier) => tier.tier === tierKeyToName[nextTierKey])
      : undefined;

    bounds[tierKey] = {
      min: tierKey === 'bronze' ? 0 : currentTier.baseRating,
      max: nextTier ? nextTier.baseRating : null,
    };

    return bounds;
  },
  {} as Record<LeaderboardTierKey, { min: number; max: number | null }>
);

const getTierKeyFromRating = (rating: number): LeaderboardTierKey => {
  for (let index = tierKeyOrder.length - 1; index >= 0; index -= 1) {
    const key = tierKeyOrder[index];
    const bounds = tierBounds[key];

    if (rating >= bounds.min) {
      return key;
    }
  }

  return 'bronze';
};

const buildTierProgress = (rating: number) => {
  const tierKey = getTierKeyFromRating(rating);
  const tierName = tierKeyToName[tierKey];
  const currentIndex = tierKeyOrder.indexOf(tierKey);
  const currentBounds = tierBounds[tierKey];
  const nextTierKey = tierKeyOrder[currentIndex + 1];
  const nextBounds = nextTierKey ? tierBounds[nextTierKey] : undefined;

  if (!nextTierKey || !nextBounds) {
    return {
      tierKey,
      tierProgress: {
        currentTier: tierName,
        currentSubTier: SUB_TIERS,
        nextTier: null,
        nextSubTier: null,
        ratingForNextTier: rating,
        ratingForNextMajorTier: rating,
        nextMajorTier: null,
        subTierFillPercentage: 1,
        majorTierFillPercentage: 1,
      },
    };
  }

  const majorRange = Math.max(nextBounds.min - currentBounds.min, 1);
  const subTierRange = majorRange / SUB_TIERS;
  const progressInTier = Math.max(0, rating - currentBounds.min);
  const currentSubTier = Math.min(
    SUB_TIERS,
    Math.floor(progressInTier / subTierRange) + 1
  );
  const currentSubTierBase =
    currentBounds.min + subTierRange * (currentSubTier - 1);
  const ratingForNextTier = Math.min(
    nextBounds.min,
    currentSubTierBase + subTierRange
  );
  const nextSubTier = currentSubTier < SUB_TIERS ? currentSubTier + 1 : null;
  const nextMajorTierName = tierKeyToName[nextTierKey];
  const nextTierName = nextSubTier !== null ? tierName : nextMajorTierName;

  const subTierFillPercentage = Math.min(
    1,
    Math.max(0, (rating - currentSubTierBase) / subTierRange)
  );
  const majorTierFillPercentage = Math.min(
    1,
    Math.max(0, progressInTier / majorRange)
  );

  return {
    tierKey,
    tierProgress: {
      currentTier: tierName,
      currentSubTier,
      nextTier: nextTierName,
      nextSubTier,
      ratingForNextTier,
      ratingForNextMajorTier: nextBounds.min,
      nextMajorTier: nextMajorTierName,
      subTierFillPercentage,
      majorTierFillPercentage,
    },
  };
};

export const getLeaderboard = publicProcedure
  .input(LeaderboardRequestSchema)
  .output(LeaderboardResponseSchema)
  .route({
    summary: 'Get leaderboard results',
    tags: ['public'],
    path: '/leaderboard/list',
  })
  .handler(async ({ input, context }) => {
    try {
      const page = Math.max(input.page ?? 1, 1);
      const pageSize = Math.max(
        1,
        Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
      );
      const ruleset = input.ruleset ?? 0;

      console.log('[orpc] leaderboard.list start', {
        input,
        page,
        pageSize,
        ruleset,
      });

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

      const leaderboardBase = context.db.$with('leaderboard_base').as(
        context.db
          .select({
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
          })
          .from(schema.playerRatings)
          .innerJoin(
            schema.players,
            eq(schema.playerRatings.playerId, schema.players.id)
          )
          .leftJoin(
            schema.playerTournamentStats,
            eq(schema.playerTournamentStats.playerId, schema.players.id)
          )
          .leftJoin(
            schema.tournaments,
            and(
              eq(
                schema.tournaments.id,
                schema.playerTournamentStats.tournamentId
              ),
              eq(schema.tournaments.ruleset, schema.playerRatings.ruleset)
            )
          )
          .leftJoin(
            schema.playerOsuRulesetData,
            and(
              eq(schema.playerOsuRulesetData.playerId, schema.players.id),
              eq(
                schema.playerOsuRulesetData.ruleset,
                schema.playerRatings.ruleset
              )
            )
          )
          .where(eq(schema.playerRatings.ruleset, ruleset))
          .groupBy(
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
            schema.playerOsuRulesetData.globalRank
          )
      );

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
            const bounds = tierBounds[tierKey];

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

      console.log('[orpc] leaderboard.list pagination', {
        total,
        pages,
        currentPage,
        offset,
      });

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

      console.log('[orpc] leaderboard.list rows', {
        rowCount: leaderboardRows.length,
        firstRow: leaderboardRows[0],
      });

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

      console.log('[orpc] leaderboard.list leaderboard', {
        leaderboardCount: leaderboard.length,
        sample: leaderboard[0],
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
  });

export const getUser = protectedProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
    })
  )
  .route({
    summary: 'Get a user',
    tags: ['authenticated'],
    path: '/users/{id}',
  })
  .handler(async ({ input, context }) => {
    const user = await context.db.query.users.findFirst({
      where: eq(schema.users.id, input.id),
      with: {
        userSettings: true,
        player: true,
      },
    });

    if (!user) {
      throw new ORPCError('NOT_FOUND', {
        message: 'User not found',
      });
    }

    return user;
  });

export const getCurrentUser = protectedProcedure
  .route({
    summary: 'Get the authenticated user',
    tags: ['authenticated'],
    path: '/users/me',
  })
  .handler(async ({ context }) => {
    const { osuId } = context.session.user;

    if (!osuId) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Authenticated user does not have an associated osu! id',
      });
    }

    const player = await context.db.query.players.findFirst({
      where: eq(schema.players.osuId, osuId),
    });

    if (!player) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Player not found for the current session',
      });
    }

    const user = await context.db.query.users.findFirst({
      where: eq(schema.users.playerId, player.id),
    });

    return {
      player: {
        id: player.id,
        username: player.username,
        osuId: player.osuId,
        country: player.country,
      },
      scopes: user?.scopes ?? [],
      userId: user?.id ?? null,
    };
  });

// Example procedure
export const getPlayer = publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
    })
  )
  .handler(async ({ input, context }) => {
    const player = await context.db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, input.id))
      .limit(1);

    if (!player[0]) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Player not found',
      });
    }

    return player[0];
  });

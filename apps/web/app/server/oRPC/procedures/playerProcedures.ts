import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod';

import type { DatabaseClient } from '@/lib/db';
import * as schema from '@otr/core/db/schema';
import {
  PlayerDashboardRequestSchema,
  PlayerDashboardStatsSchema,
  PlayerCompactSchema,
  type PlayerDashboardStats,
  type PlayerFrequency,
  type PlayerRatingAdjustment,
} from '@/lib/orpc/schema/playerDashboard';
import { PlayerTournamentsRequestSchema } from '@/lib/orpc/schema/playerTournaments';
import { TournamentListItemSchema } from '@/lib/orpc/schema/tournament';
import { PlayerSchema } from '@/lib/orpc/schema/player';
import {
  RatingAdjustmentType,
  Ruleset,
  VerificationStatus,
} from '@otr/core/osu';
import { buildTierProgress } from '@/lib/utils/tierProgress';

import { publicProcedure } from './base';

export const getPlayer = publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
    })
  )
  .output(PlayerSchema)
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

    return PlayerSchema.parse(player[0]);
  });
type PlayerRow = typeof schema.players.$inferSelect;
type PlayerRatingRow = typeof schema.playerRatings.$inferSelect;
type PlayerMatchStatsRow = typeof schema.playerMatchStats.$inferSelect;

const VALID_RULESETS = new Set<Ruleset>([
  Ruleset.Osu,
  Ruleset.Taiko,
  Ruleset.Catch,
  Ruleset.ManiaOther,
  Ruleset.Mania4k,
  Ruleset.Mania7k,
]);

const MAX_FREQUENCY_RESULTS = 10;

interface DateBounds {
  start: string | null;
  end: string | null;
}

const parseDateInput = (value?: string): Date | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
};

const resolveDateBounds = (dateMin?: string, dateMax?: string): DateBounds => {
  const minDate = parseDateInput(dateMin);
  const maxDate = parseDateInput(dateMax);

  if (minDate) {
    minDate.setUTCHours(0, 0, 0, 0);
  }

  if (maxDate) {
    maxDate.setUTCHours(23, 59, 59, 999);
  }

  return {
    start: minDate ? minDate.toISOString() : null,
    end: maxDate ? maxDate.toISOString() : null,
  };
};

const isStrictNumeric = (value: string): boolean => /^[0-9]+$/.test(value);

const normaliseKey = (value: string): string => value.trim();

const findPlayerByKey = async (
  db: DatabaseClient,
  key: string
): Promise<PlayerRow> => {
  const trimmed = normaliseKey(key);

  if (!trimmed) {
    throw new ORPCError('NOT_FOUND', {
      message: 'Player not found',
    });
  }

  if (isStrictNumeric(trimmed)) {
    const numericKey = Number(trimmed);

    const byId = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, numericKey))
      .limit(1);

    if (byId[0]) {
      return byId[0];
    }

    const byOsuId = await db
      .select()
      .from(schema.players)
      .where(eq(schema.players.osuId, numericKey))
      .limit(1);

    if (byOsuId[0]) {
      return byOsuId[0];
    }
  }

  const byUsername = await db
    .select()
    .from(schema.players)
    .where(ilike(schema.players.username, trimmed))
    .limit(1);

  if (byUsername[0]) {
    return byUsername[0];
  }

  throw new ORPCError('NOT_FOUND', {
    message: 'Player not found',
  });
};

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

interface MatchStatsRow {
  stats: PlayerMatchStatsRow;
  matchStartTime: string | null;
  tournamentId: number;
}

const computeBestWinStreak = (rows: MatchStatsRow[]): number => {
  if (!rows.length) {
    return 0;
  }

  const sorted = [...rows].sort((a, b) => {
    const aTime = a.matchStartTime ? new Date(a.matchStartTime).getTime() : 0;
    const bTime = b.matchStartTime ? new Date(b.matchStartTime).getTime() : 0;
    return aTime - bTime;
  });

  let streak = 0;
  let best = 0;

  for (const row of sorted) {
    if (row.stats.won) {
      streak += 1;
      best = Math.max(best, streak);
    } else {
      streak = 0;
    }
  }

  return best;
};

const getEarliestMatchStart = (rows: MatchStatsRow[]): string | null => {
  const timestamps = rows
    .map((row) => row.matchStartTime)
    .filter((value): value is string => Boolean(value))
    .sort();

  return timestamps[0] ?? null;
};

const getLatestMatchStart = (rows: MatchStatsRow[]): string | null => {
  const timestamps = rows
    .map((row) => row.matchStartTime)
    .filter((value): value is string => Boolean(value))
    .sort();

  return timestamps[timestamps.length - 1] ?? null;
};

const buildMatchAggregates = (
  rows: MatchStatsRow[],
  adjustments: PlayerRatingAdjustment[],
  ratingRow: PlayerRatingRow | null | undefined,
  bounds: DateBounds
) => {
  const matchesPlayed = rows.length;
  const matchesWon = rows.reduce(
    (accumulator, row) => accumulator + (row.stats.won ? 1 : 0),
    0
  );
  const matchesLost = matchesPlayed - matchesWon;

  const gamesWon = rows.reduce(
    (accumulator, row) => accumulator + row.stats.gamesWon,
    0
  );
  const gamesLost = rows.reduce(
    (accumulator, row) => accumulator + row.stats.gamesLost,
    0
  );
  const gamesPlayed = rows.reduce(
    (accumulator, row) => accumulator + row.stats.gamesPlayed,
    0
  );

  const sumMatchCost = rows.reduce(
    (accumulator, row) => accumulator + toNumber(row.stats.matchCost),
    0
  );
  const sumAverageScore = rows.reduce(
    (accumulator, row) => accumulator + toNumber(row.stats.averageScore),
    0
  );
  const sumAverageMisses = rows.reduce(
    (accumulator, row) => accumulator + toNumber(row.stats.averageMisses),
    0
  );
  const sumAverageAccuracy = rows.reduce(
    (accumulator, row) => accumulator + toNumber(row.stats.averageAccuracy),
    0
  );
  const sumAveragePlacement = rows.reduce(
    (accumulator, row) => accumulator + toNumber(row.stats.averagePlacement),
    0
  );

  const averageMatchCostAggregate =
    matchesPlayed > 0 ? sumMatchCost / matchesPlayed : 0;
  const matchAverageScoreAggregate =
    matchesPlayed > 0 ? sumAverageScore / matchesPlayed : 0;
  const matchAverageMissesAggregate =
    matchesPlayed > 0 ? sumAverageMisses / matchesPlayed : 0;
  const matchAverageAccuracyAggregate =
    matchesPlayed > 0 ? sumAverageAccuracy / matchesPlayed : 0;
  const averageGamesPlayedAggregate =
    matchesPlayed > 0 ? gamesPlayed / matchesPlayed : 0;
  const averagePlacingAggregate =
    matchesPlayed > 0 ? sumAveragePlacement / matchesPlayed : 0;

  let ratingGained = 0;
  let highestRating: number | null = null;

  if (adjustments.length > 0) {
    const firstAdjustment = adjustments[0];
    const lastAdjustment = adjustments[adjustments.length - 1];

    ratingGained =
      toNumber(lastAdjustment.ratingAfter) -
      toNumber(firstAdjustment.ratingAfter);

    highestRating = adjustments.reduce((max, adjustment) => {
      const ratingAfter = toNumber(adjustment.ratingAfter);
      return Number.isFinite(ratingAfter) ? Math.max(max, ratingAfter) : max;
    }, Number.NEGATIVE_INFINITY);

    if (!Number.isFinite(highestRating)) {
      highestRating = null;
    }
  } else if (ratingRow) {
    highestRating = toNumber(ratingRow.rating);
  }

  const periodStart =
    adjustments[0]?.timestamp ??
    getEarliestMatchStart(rows) ??
    bounds.start ??
    null;

  const periodEnd =
    adjustments[adjustments.length - 1]?.timestamp ??
    getLatestMatchStart(rows) ??
    bounds.end ??
    null;

  const matchStats = matchesPlayed
    ? {
        averageMatchCostAggregate,
        highestRating,
        ratingGained,
        gamesWon,
        gamesLost,
        gamesPlayed,
        matchesWon,
        matchesLost,
        matchesPlayed,
        gameWinRate: gamesPlayed > 0 ? gamesWon / gamesPlayed : 0,
        matchWinRate: matchesPlayed > 0 ? matchesWon / matchesPlayed : 0,
        bestWinStreak: computeBestWinStreak(rows),
        matchAverageScoreAggregate,
        matchAverageMissesAggregate,
        matchAverageAccuracyAggregate,
        averageGamesPlayedAggregate,
        averagePlacingAggregate,
        periodStart,
        periodEnd,
      }
    : null;

  const tournamentsPlayed = new Set(rows.map((row) => row.tournamentId)).size;

  return {
    matchStats,
    matchesPlayed,
    matchesWon,
    tournamentsPlayed,
  } as const;
};

export const getPlayerTournaments = publicProcedure
  .input(PlayerTournamentsRequestSchema)
  .output(TournamentListItemSchema.array())
  .handler(async ({ input, context }) => {
    const player = await findPlayerByKey(context.db, input.key);

    const filters = [
      sql`${schema.tournaments.id} IN (
        SELECT DISTINCT ${schema.playerTournamentStats.tournamentId}
        FROM ${schema.playerTournamentStats}
        WHERE ${schema.playerTournamentStats.playerId} = ${player.id}
      )`,
    ];

    if (input.ruleset != null) {
      filters.push(eq(schema.tournaments.ruleset, input.ruleset));
    }

    if (input.dateMin) {
      filters.push(gte(schema.tournaments.startTime, input.dateMin));
    }

    if (input.dateMax) {
      filters.push(lte(schema.tournaments.endTime, input.dateMax));
    }

    const tournamentRows = await context.db
      .select({
        id: schema.tournaments.id,
        created: schema.tournaments.created,
        name: schema.tournaments.name,
        abbreviation: schema.tournaments.abbreviation,
        forumUrl: schema.tournaments.forumUrl,
        rankRangeLowerBound: schema.tournaments.rankRangeLowerBound,
        ruleset: schema.tournaments.ruleset,
        lobbySize: schema.tournaments.lobbySize,
        startTime: schema.tournaments.startTime,
        endTime: schema.tournaments.endTime,
        verificationStatus: schema.tournaments.verificationStatus,
        rejectionReason: schema.tournaments.rejectionReason,
      })
      .from(schema.tournaments)
      .where(sql.join(filters, sql` AND `))
      .orderBy(desc(schema.tournaments.endTime));

    return tournamentRows.map((row) =>
      TournamentListItemSchema.parse({
        id: row.id,
        created: row.created,
        name: row.name,
        abbreviation: row.abbreviation,
        forumUrl: row.forumUrl,
        rankRangeLowerBound: row.rankRangeLowerBound,
        ruleset: row.ruleset as Ruleset,
        lobbySize: row.lobbySize,
        startTime: row.startTime ?? null,
        endTime: row.endTime ?? null,
        verificationStatus: row.verificationStatus as VerificationStatus,
        rejectionReason: row.rejectionReason,
      })
    );
  });

export const getPlayerDashboardStats = publicProcedure
  .input(PlayerDashboardRequestSchema)
  .output(PlayerDashboardStatsSchema)
  .handler(async ({ input, context }) => {
    const player = await findPlayerByKey(context.db, input.key);

    const playerDefaultRuleset = VALID_RULESETS.has(
      player.defaultRuleset as Ruleset
    )
      ? (player.defaultRuleset as Ruleset)
      : Ruleset.Osu;

    const resolvedRuleset = (() => {
      if (input.ruleset != null && VALID_RULESETS.has(input.ruleset)) {
        return input.ruleset;
      }

      return playerDefaultRuleset;
    })();

    const bounds = resolveDateBounds(input.dateMin, input.dateMax);

    const ratingRow = await context.db.query.playerRatings.findFirst({
      where: (playerRatings, { and, eq }) =>
        and(
          eq(playerRatings.playerId, player.id),
          eq(playerRatings.ruleset, resolvedRuleset)
        ),
    });

    const adjustmentFilters = [
      eq(schema.ratingAdjustments.playerId, player.id),
      eq(schema.ratingAdjustments.ruleset, resolvedRuleset),
    ];

    if (bounds.start) {
      adjustmentFilters.push(
        gte(schema.ratingAdjustments.timestamp, bounds.start)
      );
    }

    if (bounds.end) {
      adjustmentFilters.push(
        lte(schema.ratingAdjustments.timestamp, bounds.end)
      );
    }

    const adjustmentRows = await context.db
      .select({
        playerId: schema.ratingAdjustments.playerId,
        adjustmentType: schema.ratingAdjustments.adjustmentType,
        timestamp: schema.ratingAdjustments.timestamp,
        ratingBefore: schema.ratingAdjustments.ratingBefore,
        ratingAfter: schema.ratingAdjustments.ratingAfter,
        volatilityBefore: schema.ratingAdjustments.volatilityBefore,
        volatilityAfter: schema.ratingAdjustments.volatilityAfter,
        matchId: schema.ratingAdjustments.matchId,
        matchName: schema.matches.name,
        tournamentId: schema.matches.tournamentId,
      })
      .from(schema.ratingAdjustments)
      .leftJoin(
        schema.matches,
        eq(schema.matches.id, schema.ratingAdjustments.matchId)
      )
      .where(and(...adjustmentFilters))
      .orderBy(asc(schema.ratingAdjustments.timestamp));

    const adjustments = mapRatingAdjustments(adjustmentRows);

    const matchFilters = [
      eq(schema.playerMatchStats.playerId, player.id),
      eq(schema.tournaments.ruleset, resolvedRuleset),
    ];

    if (bounds.start) {
      matchFilters.push(gte(schema.matches.startTime, bounds.start));
    }

    if (bounds.end) {
      matchFilters.push(lte(schema.matches.startTime, bounds.end));
    }

    const matchStatsRows = await context.db
      .select({
        stats: schema.playerMatchStats,
        matchStartTime: schema.matches.startTime,
        tournamentId: schema.matches.tournamentId,
      })
      .from(schema.playerMatchStats)
      .innerJoin(
        schema.matches,
        eq(schema.matches.id, schema.playerMatchStats.matchId)
      )
      .innerJoin(
        schema.tournaments,
        eq(schema.tournaments.id, schema.matches.tournamentId)
      )
      .where(and(...matchFilters));

    const { matchStats, matchesPlayed, matchesWon, tournamentsPlayed } =
      buildMatchAggregates(matchStatsRows, adjustments, ratingRow, bounds);

    const teammateFrequencyMap = buildFrequencyMap(
      matchStatsRows,
      'teammateIds'
    );
    const opponentFrequencyMap = buildFrequencyMap(
      matchStatsRows,
      'opponentIds'
    );

    const [frequentTeammates, frequentOpponents] = await Promise.all([
      hydrateFrequencies(context.db, teammateFrequencyMap),
      hydrateFrequencies(context.db, opponentFrequencyMap),
    ]);

    const modFilters = [
      eq(schema.gameScores.playerId, player.id),
      eq(schema.tournaments.ruleset, resolvedRuleset),
    ];

    if (bounds.start) {
      modFilters.push(gte(schema.games.startTime, bounds.start));
    }

    if (bounds.end) {
      modFilters.push(lte(schema.games.startTime, bounds.end));
    }

    const modStatsRows = await context.db
      .select({
        mods: schema.gameScores.mods,
        count: sql<number>`COUNT(*)`,
        averageScore: sql<number>`AVG(${schema.gameScores.score})`,
      })
      .from(schema.gameScores)
      .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
      .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
      .innerJoin(
        schema.tournaments,
        eq(schema.tournaments.id, schema.matches.tournamentId)
      )
      .where(and(...modFilters))
      .groupBy(schema.gameScores.mods);

    const modStats = modStatsRows.map((row) => ({
      mods: row.mods,
      count: toNumber(row.count),
      averageScore: toNumber(row.averageScore),
    }));

    const ratingStats = ratingRow
      ? (() => {
          const { tierProgress: tierProgressData } = buildTierProgress(
            toNumber(ratingRow.rating)
          );

          return {
            ruleset: ratingRow.ruleset as Ruleset,
            rating: toNumber(ratingRow.rating),
            volatility: toNumber(ratingRow.volatility),
            percentile: toNumber(ratingRow.percentile),
            globalRank: ratingRow.globalRank,
            countryRank: ratingRow.countryRank,
            player: {
              id: player.id,
              osuId: player.osuId,
              username: player.username,
              country: player.country,
              defaultRuleset: playerDefaultRuleset,
            },
            tournamentsPlayed,
            matchesPlayed,
            winRate: matchesPlayed > 0 ? matchesWon / matchesPlayed : null,
            tierProgress: tierProgressData,
            adjustments,
            isProvisional: adjustments.length < 10,
          };
        })()
      : null;

    const response: PlayerDashboardStats = {
      playerInfo: {
        id: player.id,
        osuId: player.osuId,
        username: player.username,
        country: player.country,
        defaultRuleset: playerDefaultRuleset,
      },
      ruleset: resolvedRuleset,
      rating: ratingStats,
      matchStats,
      modStats,
      frequentTeammates,
      frequentOpponents,
      tournamentPerformanceStats: null,
    };

    return PlayerDashboardStatsSchema.parse(response);
  });

const buildFrequencyMap = (
  rows: MatchStatsRow[],
  key: 'teammateIds' | 'opponentIds'
) => {
  const map = new Map<number, number>();

  for (const row of rows) {
    for (const id of row.stats[key]) {
      if (id === row.stats.playerId) {
        continue;
      }

      map.set(id, (map.get(id) ?? 0) + 1);
    }
  }

  return map;
};

const hydrateFrequencies = async (
  db: DatabaseClient,
  frequencyMap: Map<number, number>
): Promise<PlayerFrequency[]> => {
  if (frequencyMap.size === 0) {
    return [];
  }

  const ordered = Array.from(frequencyMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_FREQUENCY_RESULTS);

  const ids = ordered.map(([id]) => id);

  const players = await db
    .select({
      id: schema.players.id,
      osuId: schema.players.osuId,
      username: schema.players.username,
      country: schema.players.country,
      defaultRuleset: schema.players.defaultRuleset,
    })
    .from(schema.players)
    .where(inArray(schema.players.id, ids));

  const playerMap = new Map<number, PlayerFrequency['player']>(
    players.map((entry) => {
      const parsed = PlayerCompactSchema.parse(entry);
      return [parsed.id, parsed];
    })
  );

  return ordered
    .map(([id, frequency]) => {
      const player = playerMap.get(id);
      if (!player) {
        return null;
      }

      return {
        player,
        frequency,
      } satisfies PlayerFrequency;
    })
    .filter((entry): entry is PlayerFrequency => entry !== null);
};

const mapRatingAdjustments = (
  rows: Array<
    Pick<
      typeof schema.ratingAdjustments.$inferSelect,
      | 'playerId'
      | 'adjustmentType'
      | 'timestamp'
      | 'ratingBefore'
      | 'ratingAfter'
      | 'volatilityBefore'
      | 'volatilityAfter'
      | 'matchId'
    > & {
      matchName: string | null;
      tournamentId: number | null;
    }
  >
): PlayerRatingAdjustment[] =>
  rows.map((row) => ({
    playerId: row.playerId,
    adjustmentType: row.adjustmentType as RatingAdjustmentType,
    timestamp: row.timestamp,
    ratingBefore: row.ratingBefore,
    ratingAfter: row.ratingAfter,
    volatilityBefore: row.volatilityBefore,
    volatilityAfter: row.volatilityAfter,
    matchId: row.matchId,
    ratingDelta: row.ratingAfter - row.ratingBefore,
    volatilityDelta: row.volatilityAfter - row.volatilityBefore,
    match:
      row.matchId && row.matchName
        ? {
            id: row.matchId,
            name: row.matchName,
            tournamentId: row.tournamentId ?? null,
          }
        : null,
  }));

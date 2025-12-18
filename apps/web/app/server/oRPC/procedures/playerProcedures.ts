import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from 'drizzle-orm';
import { z } from 'zod/v4';

import type { DatabaseClient } from '@/lib/db';
import * as schema from '@otr/core/db/schema';
import {
  PlayerBeatmapsRequestSchema,
  PlayerBeatmapStatsSchema,
  PlayerBeatmapsResponseSchema,
} from '@/lib/orpc/schema/playerBeatmaps';
import {
  PlayerStatsSchema,
  PlayerCompactSchema,
  type PlayerStats,
  type PlayerFrequency,
  type PlayerRatingAdjustment,
} from '@/lib/orpc/schema/playerStats';
import { TournamentListItemSchema } from '@/lib/orpc/schema/tournament';
import { PlayerSchema } from '@/lib/orpc/schema/player';
import {
  Mods,
  RatingAdjustmentType,
  Ruleset,
  ScoringType,
  VerificationStatus,
} from '@otr/core/osu';
import { buildTierProgress } from '@/lib/utils/tierProgress';

import { publicProcedure } from './base';

const KeyTypeSchema = z.enum(['otr', 'osu']).default('otr');

async function resolvePlayerId(
  db: DatabaseClient,
  id: number,
  keyType: 'otr' | 'osu'
): Promise<number> {
  if (keyType === 'otr') {
    const player = await db.query.players.findFirst({
      where: (players, { eq }) => eq(players.id, id),
      columns: { id: true },
    });
    if (!player) {
      throw new ORPCError('NOT_FOUND', { message: 'Player not found' });
    }
    return player.id;
  }

  const player = await db.query.players.findFirst({
    where: (players, { eq }) => eq(players.osuId, id),
    columns: { id: true },
  });
  if (!player) {
    throw new ORPCError('NOT_FOUND', { message: 'Player not found' });
  }
  return player.id;
}

export const getPlayer = publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      keyType: KeyTypeSchema,
    })
  )
  .output(PlayerSchema)
  .route({
    summary: 'Get player details',
    description:
      'Fetch player information by ID.\n\n' +
      '**Examples:**\n' +
      '- By o!TR ID: `GET /players/123`\n' +
      '- By osu! ID: `GET /players/4504101?keyType=osu`',
    tags: ['public'],
    method: 'GET',
    path: '/players/{id}',
  })
  .handler(async ({ input, context }) => {
    const playerId = await resolvePlayerId(context.db, input.id, input.keyType);

    const player = await context.db
      .select()
      .from(schema.players)
      .where(eq(schema.players.id, playerId))
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

const tournamentListItemColumns = {
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
  isLazer: schema.tournaments.isLazer,
} as const;

const playerCompactColumns = {
  id: schema.players.id,
  osuId: schema.players.osuId,
  username: schema.players.username,
  country: schema.players.country,
  defaultRuleset: schema.players.defaultRuleset,
} as const;

type RatingAdjustmentSummary = Pick<
  typeof schema.ratingAdjustments.$inferSelect,
  | 'playerId'
  | 'adjustmentType'
  | 'timestamp'
  | 'ratingBefore'
  | 'ratingAfter'
  | 'volatilityBefore'
  | 'volatilityAfter'
  | 'matchId'
>;

const ratingAdjustmentSummaryColumns = {
  playerId: schema.ratingAdjustments.playerId,
  adjustmentType: schema.ratingAdjustments.adjustmentType,
  timestamp: schema.ratingAdjustments.timestamp,
  ratingBefore: schema.ratingAdjustments.ratingBefore,
  ratingAfter: schema.ratingAdjustments.ratingAfter,
  volatilityBefore: schema.ratingAdjustments.volatilityBefore,
  volatilityAfter: schema.ratingAdjustments.volatilityAfter,
  matchId: schema.ratingAdjustments.matchId,
} as const;

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // Allow usernames that are entirely numeric (e.g., "846553767646068").
    // Prefer an exact username match before interpreting the key as an ID.
    const byExactUsername = await db
      .select()
      .from(schema.players)
      .where(ilike(schema.players.username, trimmed))
      .limit(1);

    if (byExactUsername[0]) {
      return byExactUsername[0];
    }

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
  .input(
    z.object({
      id: z.number().int().positive(),
      keyType: KeyTypeSchema,
      ruleset: z.number().int().optional(),
      dateMin: z.string().optional(),
      dateMax: z.string().optional(),
    })
  )
  .output(TournamentListItemSchema.array())
  .route({
    summary: 'List player tournaments',
    description:
      'List tournaments a player has participated in.\n\n' +
      '**Examples:**\n' +
      '- By o!TR ID: `GET /players/123/tournaments`\n' +
      '- By osu! ID: `GET /players/4504101/tournaments?keyType=osu`',
    tags: ['public'],
    method: 'GET',
    path: '/players/{id}/tournaments',
  })
  .handler(async ({ input, context }) => {
    const playerId = await resolvePlayerId(context.db, input.id, input.keyType);

    const filters = [
      sql`${schema.tournaments.id} IN (
        SELECT DISTINCT ${schema.playerTournamentStats.tournamentId}
        FROM ${schema.playerTournamentStats}
        WHERE ${schema.playerTournamentStats.playerId} = ${playerId}
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
      .select(tournamentListItemColumns)
      .from(schema.tournaments)
      .where(sql.join(filters, sql` AND `))
      .orderBy(desc(schema.tournaments.endTime));

    return tournamentRows.map((row) =>
      TournamentListItemSchema.parse({
        ...row,
        ruleset: row.ruleset as Ruleset,
        verificationStatus: row.verificationStatus as VerificationStatus,
        submittedByUsername: null,
        verifiedByUsername: null,
      })
    );
  });

export const getPlayerBeatmaps = publicProcedure
  .input(PlayerBeatmapsRequestSchema)
  .output(PlayerBeatmapsResponseSchema)
  .route({
    summary: 'List player beatmaps',
    description:
      'List beatmaps created by a player.\n\n' +
      '**Examples:**\n' +
      '- By o!TR ID: `GET /players/123/beatmaps`\n' +
      '- By osu! ID: `GET /players/4504101/beatmaps?keyType=osu`',
    tags: ['public'],
    method: 'GET',
    path: '/players/{id}/beatmaps',
  })
  .handler(async ({ input, context }) => {
    const playerId = await resolvePlayerId(context.db, input.id, input.keyType);

    const DEFAULT_LIMIT = 25;
    const MAX_LIMIT = 50;
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = input.offset ?? 0;

    const totalCountRow = await context.db
      .select({
        count: sql<number>`COUNT(DISTINCT ${schema.joinPooledBeatmaps.pooledBeatmapsId})`,
      })
      .from(schema.joinBeatmapCreators)
      .innerJoin(
        schema.joinPooledBeatmaps,
        eq(
          schema.joinBeatmapCreators.createdBeatmapsId,
          schema.joinPooledBeatmaps.pooledBeatmapsId
        )
      )
      .innerJoin(
        schema.beatmaps,
        eq(schema.beatmaps.id, schema.joinBeatmapCreators.createdBeatmapsId)
      )
      .innerJoin(
        schema.tournaments,
        eq(
          schema.tournaments.id,
          schema.joinPooledBeatmaps.tournamentsPooledInId
        )
      )
      .where(
        and(
          eq(schema.joinBeatmapCreators.creatorsId, playerId),
          eq(
            schema.tournaments.verificationStatus,
            VerificationStatus.Verified
          ),
          // Filter by the tournament ruleset because mania variants reuse the same
          // beatmap ruleset (e.g., 4k/7k both map back to Mania = 3).
          input.ruleset != null
            ? eq(schema.tournaments.ruleset, input.ruleset)
            : undefined
        )
      );

    const totalCount = Number(totalCountRow[0]?.count ?? 0);

    if (totalCount === 0) {
      return PlayerBeatmapsResponseSchema.parse({
        totalCount: 0,
        beatmaps: [],
      });
    }

    if (offset >= totalCount) {
      return PlayerBeatmapsResponseSchema.parse({
        totalCount,
        beatmaps: [],
      });
    }

    const tournamentCountExpr = sql<number>`(
      SELECT COUNT(DISTINCT tournament_id) FROM (
        SELECT jpb.tournaments_pooled_in_id AS tournament_id
        FROM join_pooled_beatmaps jpb
        INNER JOIN tournaments t ON t.id = jpb.tournaments_pooled_in_id
        WHERE jpb.pooled_beatmaps_id = ${schema.beatmaps.id}
          AND t.verification_status = ${VerificationStatus.Verified}
        UNION
        SELECT t.id AS tournament_id
        FROM games g
        INNER JOIN matches m ON m.id = g.match_id
        INNER JOIN tournaments t ON t.id = m.tournament_id
        WHERE g.beatmap_id = ${schema.beatmaps.id}
          AND t.verification_status = ${VerificationStatus.Verified}
          AND m.verification_status = ${VerificationStatus.Verified}
          AND g.verification_status = ${VerificationStatus.Verified}
      ) AS combined_tournaments
    )`;
    const gameCountExpr = sql<number>`(
      SELECT COUNT(g.id)
      FROM games g
      INNER JOIN matches m ON m.id = g.match_id
      INNER JOIN tournaments t ON t.id = m.tournament_id
      WHERE g.beatmap_id = ${schema.beatmaps.id}
        AND t.verification_status = ${VerificationStatus.Verified}
        AND m.verification_status = ${VerificationStatus.Verified}
        AND g.verification_status = ${VerificationStatus.Verified}
    )`;

    const beatmapOrderingRows = await context.db
      .select({
        beatmapId: schema.beatmaps.id,
        osuId: schema.beatmaps.osuId,
        tournamentCount: tournamentCountExpr,
        gameCount: gameCountExpr,
      })
      .from(schema.beatmaps)
      .innerJoin(
        schema.joinBeatmapCreators,
        eq(schema.beatmaps.id, schema.joinBeatmapCreators.createdBeatmapsId)
      )
      .innerJoin(
        schema.joinPooledBeatmaps,
        eq(schema.beatmaps.id, schema.joinPooledBeatmaps.pooledBeatmapsId)
      )
      .innerJoin(
        schema.tournaments,
        eq(
          schema.tournaments.id,
          schema.joinPooledBeatmaps.tournamentsPooledInId
        )
      )
      .where(
        and(
          eq(schema.joinBeatmapCreators.creatorsId, playerId),
          eq(
            schema.tournaments.verificationStatus,
            VerificationStatus.Verified
          ),
          // Keep ordering scoped to the tournament ruleset so pagination stays in sync
          // when a player switches between ruleset tabs.
          input.ruleset != null
            ? eq(schema.tournaments.ruleset, input.ruleset)
            : undefined
        )
      )
      .groupBy(schema.beatmaps.id, schema.beatmaps.osuId)
      .orderBy(
        desc(tournamentCountExpr),
        desc(gameCountExpr),
        desc(schema.beatmaps.osuId)
      )
      .limit(limit)
      .offset(offset);

    const beatmapIds = beatmapOrderingRows.map((row) => row.beatmapId);

    if (!beatmapIds.length) {
      return PlayerBeatmapsResponseSchema.parse({
        totalCount,
        beatmaps: [],
      });
    }

    const beatmapRows = await context.db
      .select({
        id: schema.beatmaps.id,
        osuId: schema.beatmaps.osuId,
        rankedStatus: schema.beatmaps.rankedStatus,
        diffName: schema.beatmaps.diffName,
        totalLength: schema.beatmaps.totalLength,
        drainLength: schema.beatmaps.drainLength,
        bpm: schema.beatmaps.bpm,
        countCircle: schema.beatmaps.countCircle,
        countSlider: schema.beatmaps.countSlider,
        countSpinner: schema.beatmaps.countSpinner,
        cs: schema.beatmaps.cs,
        hp: schema.beatmaps.hp,
        od: schema.beatmaps.od,
        ar: schema.beatmaps.ar,
        sr: schema.beatmaps.sr,
        maxCombo: schema.beatmaps.maxCombo,
        beatmapsetId: schema.beatmapsets.osuId,
        ruleset: schema.beatmaps.ruleset,
        artist: schema.beatmapsets.artist,
        title: schema.beatmapsets.title,
        tournamentId: schema.tournaments.id,
        tournamentCreated: schema.tournaments.created,
        tournamentName: schema.tournaments.name,
        tournamentAbbreviation: schema.tournaments.abbreviation,
        tournamentForumUrl: schema.tournaments.forumUrl,
        tournamentRankRangeLowerBound: schema.tournaments.rankRangeLowerBound,
        tournamentRuleset: schema.tournaments.ruleset,
        tournamentLobbySize: schema.tournaments.lobbySize,
        tournamentStartTime: schema.tournaments.startTime,
        tournamentEndTime: schema.tournaments.endTime,
        tournamentVerificationStatus: schema.tournaments.verificationStatus,
        tournamentRejectionReason: schema.tournaments.rejectionReason,
        tournamentIsLazer: schema.tournaments.isLazer,
        gamesPlayed: sql<number>`COUNT(DISTINCT ${schema.games.id})`,
        modsUsed: sql<Mods[]>`array_agg(${schema.games.mods})`,
      })
      .from(schema.beatmaps)
      .innerJoin(
        schema.beatmapsets,
        eq(schema.beatmaps.beatmapsetId, schema.beatmapsets.id)
      )
      .innerJoin(
        schema.joinBeatmapCreators,
        eq(schema.beatmaps.id, schema.joinBeatmapCreators.createdBeatmapsId)
      )
      .innerJoin(
        schema.joinPooledBeatmaps,
        eq(schema.beatmaps.id, schema.joinPooledBeatmaps.pooledBeatmapsId)
      )
      .innerJoin(
        schema.tournaments,
        eq(
          schema.tournaments.id,
          schema.joinPooledBeatmaps.tournamentsPooledInId
        )
      )
      .leftJoin(
        schema.matches,
        and(
          eq(schema.matches.tournamentId, schema.tournaments.id),
          eq(schema.matches.verificationStatus, VerificationStatus.Verified)
        )
      )
      .leftJoin(
        schema.games,
        and(
          eq(schema.games.beatmapId, schema.beatmaps.id),
          eq(schema.games.matchId, schema.matches.id),
          eq(schema.games.verificationStatus, VerificationStatus.Verified)
        )
      )
      .where(
        and(
          inArray(schema.beatmaps.id, beatmapIds),
          eq(
            schema.tournaments.verificationStatus,
            VerificationStatus.Verified
          ),
          // Ensure hydrated tournaments also belong to the requested ruleset.
          input.ruleset != null
            ? eq(schema.tournaments.ruleset, input.ruleset)
            : undefined
        )
      )
      .groupBy(
        schema.beatmaps.id,
        schema.beatmaps.osuId,
        schema.beatmaps.rankedStatus,
        schema.beatmaps.diffName,
        schema.beatmaps.totalLength,
        schema.beatmaps.drainLength,
        schema.beatmaps.bpm,
        schema.beatmaps.countCircle,
        schema.beatmaps.countSlider,
        schema.beatmaps.countSpinner,
        schema.beatmaps.cs,
        schema.beatmaps.hp,
        schema.beatmaps.od,
        schema.beatmaps.ar,
        schema.beatmaps.sr,
        schema.beatmaps.maxCombo,
        schema.beatmaps.ruleset,
        schema.beatmapsets.osuId,
        schema.beatmapsets.artist,
        schema.beatmapsets.title,
        schema.tournaments.id,
        schema.tournaments.created,
        schema.tournaments.name,
        schema.tournaments.abbreviation,
        schema.tournaments.forumUrl,
        schema.tournaments.rankRangeLowerBound,
        schema.tournaments.ruleset,
        schema.tournaments.lobbySize,
        schema.tournaments.startTime,
        schema.tournaments.endTime,
        schema.tournaments.verificationStatus,
        schema.tournaments.rejectionReason
      )
      .orderBy(desc(schema.tournaments.endTime));

    interface BeatmapData {
      id: number;
      osuId: number;
      rankedStatus: number;
      diffName: string;
      totalLength: number;
      drainLength: number;
      bpm: number;
      countCircle: number;
      countSlider: number;
      countSpinner: number;
      cs: number;
      hp: number;
      od: number;
      ar: number;
      sr: number;
      maxCombo: number | null;
      beatmapsetId: number;
      ruleset: number;
      artist: string;
      title: string;
      tournamentCount: number;
      gameCount: number;
      tournaments: Array<{
        id: number;
        created: string;
        name: string;
        abbreviation: string;
        forumUrl: string;
        rankRangeLowerBound: number;
        ruleset: number;
        lobbySize: number;
        startTime: string | null;
        endTime: string | null;
        verificationStatus: number;
        rejectionReason: number;
        isLazer: boolean;
        gamesPlayed: number;
        mostCommonMod: number;
        submittedByUsername: string | null;
        verifiedByUsername: string | null;
      }>;
    }

    const beatmapsMap = new Map<number, BeatmapData>();
    const beatmapIdSet = new Set(beatmapIds);

    for (const row of beatmapRows) {
      if (!beatmapIdSet.has(row.id)) {
        continue;
      }

      if (!beatmapsMap.has(row.id)) {
        beatmapsMap.set(row.id, {
          id: row.id,
          osuId: row.osuId,
          rankedStatus: row.rankedStatus,
          diffName: row.diffName,
          totalLength: row.totalLength,
          drainLength: row.drainLength,
          bpm: row.bpm,
          countCircle: row.countCircle,
          countSlider: row.countSlider,
          countSpinner: row.countSpinner,
          cs: row.cs,
          hp: row.hp,
          od: row.od,
          ar: row.ar,
          sr: row.sr,
          maxCombo: row.maxCombo,
          beatmapsetId: row.beatmapsetId,
          ruleset: row.ruleset,
          artist: row.artist ?? '',
          title: row.title ?? '',
          tournamentCount: 0,
          gameCount: 0,
          tournaments: [],
        });
      }

      const beatmap = beatmapsMap.get(row.id);
      if (!beatmap) {
        continue;
      }

      beatmap.tournamentCount++;
      beatmap.gameCount += Number(row.gamesPlayed);

      let mostCommonMod = Mods.None;
      if (row.modsUsed && row.modsUsed.length > 0) {
        const modCounts = new Map<number, number>();
        for (const mod of row.modsUsed) {
          if (mod == null) {
            continue;
          }

          const convertedMod = mod === Mods.None ? Mods.NoFail : mod;

          modCounts.set(convertedMod, (modCounts.get(convertedMod) ?? 0) + 1);
        }

        let maxCount = 0;
        for (const [mod, count] of modCounts.entries()) {
          if (count > maxCount) {
            maxCount = count;
            mostCommonMod = mod;
          }
        }
      }

      beatmap.tournaments.push({
        id: row.tournamentId,
        created: row.tournamentCreated,
        name: row.tournamentName,
        abbreviation: row.tournamentAbbreviation,
        forumUrl: row.tournamentForumUrl,
        rankRangeLowerBound: row.tournamentRankRangeLowerBound,
        ruleset: row.tournamentRuleset,
        lobbySize: row.tournamentLobbySize,
        startTime: row.tournamentStartTime,
        endTime: row.tournamentEndTime,
        verificationStatus: row.tournamentVerificationStatus,
        rejectionReason: row.tournamentRejectionReason,
        isLazer: row.tournamentIsLazer,
        gamesPlayed: Number(row.gamesPlayed),
        mostCommonMod: Number(mostCommonMod),
        submittedByUsername: null,
        verifiedByUsername: null,
      });
    }

    const orderIndex = new Map<number, number>();
    beatmapOrderingRows.forEach((row, index) => {
      orderIndex.set(row.beatmapId, index);
    });

    const beatmaps = Array.from(beatmapsMap.values())
      .sort((a, b) => {
        const aIndex = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
        const bIndex = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
        return aIndex - bIndex;
      })
      .map((beatmap) => ({
        ...beatmap,
        tournaments: beatmap.tournaments,
      }));

    return PlayerBeatmapsResponseSchema.parse({
      totalCount,
      beatmaps: PlayerBeatmapStatsSchema.array().parse(beatmaps),
    });
  });

export const getPlayerStats = publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      keyType: KeyTypeSchema,
      ruleset: z.number().int().optional(),
      dateMin: z.string().optional(),
      dateMax: z.string().optional(),
    })
  )
  .output(PlayerStatsSchema)
  .route({
    summary: 'Get player stats',
    description:
      'Fetch comprehensive player statistics including ratings, match history, and mod usage.\n\n' +
      '**Examples:**\n' +
      '- By o!TR ID: `GET /players/123/stats`\n' +
      '- By osu! ID: `GET /players/4504101/stats?keyType=osu`',
    tags: ['public'],
    method: 'GET',
    path: '/players/{id}/stats',
  })
  .handler(async ({ input, context }) => {
    const playerId = await resolvePlayerId(context.db, input.id, input.keyType);

    const player = await context.db.query.players.findFirst({
      where: (players, { eq }) => eq(players.id, playerId),
    });

    if (!player) {
      throw new ORPCError('NOT_FOUND', { message: 'Player not found' });
    }

    const playerDefaultRuleset = VALID_RULESETS.has(
      player.defaultRuleset as Ruleset
    )
      ? (player.defaultRuleset as Ruleset)
      : Ruleset.Osu;

    const resolvedRuleset = (() => {
      if (
        input.ruleset != null &&
        VALID_RULESETS.has(input.ruleset as Ruleset)
      ) {
        return input.ruleset as Ruleset;
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
        ...ratingAdjustmentSummaryColumns,
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
      eq(schema.gameScores.verificationStatus, VerificationStatus.Verified),
      eq(schema.tournaments.ruleset, resolvedRuleset),
      eq(schema.games.scoringType, ScoringType.ScoreV2),
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

    const response: PlayerStats = {
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

    return PlayerStatsSchema.parse(response);
  });

// Public helper to resolve a fuzzy search key (username, osuId, or internal id)
// into a canonical playerId to be used with other player endpoints.
// Note: No public resolver endpoint is exposed. Callers should obtain a
// canonical playerId via existing discovery flows and pass that id to public
// endpoints.

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
    .select(playerCompactColumns)
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
    RatingAdjustmentSummary & {
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

import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

import * as schema from '@otr/core/db/schema';
import { Mods, Ruleset, TeamType, VerificationStatus } from '@otr/core/osu';
import {
  BeatmapStatsResponseSchema,
  BeatmapTournamentMatchResponseSchema,
  type BeatmapStatsResponse,
  type BeatmapTournamentUsage,
  type BeatmapUsagePoint,
  type BeatmapModDistribution,
  type BeatmapModScoreDistribution,
  type BeatmapPerformanceSummary,
  type BeatmapScorePercentilePoint,
  type BeatmapScoreSample,
  type BeatmapTeamVsMarginSummary,
  type BeatmapTierBreakdown,
  type BeatmapTierScoreSummary,
  type BeatmapTopPerformer,
} from '@/lib/orpc/schema/beatmapStats';
import { getRankRangeBucketKey } from '@/lib/beatmaps/rankRange';
import {
  mostCommonDisplayMods,
  resolveGameModsFromScores,
} from '@/lib/utils/mods';
import { tierNames } from '@/lib/utils/tierData';
import { getRelatedBeatmapDifficulties } from '@/lib/orpc/queries/relatedBeatmapDifficulties';

import { publicProcedure } from './base';
import {
  STRIPPED_SCORE_MODS_MASK,
  TEAM_VS_MARGIN_BUCKET_BOUNDS,
  TIER_RATING_BOUNDARIES,
  summarizeFreemodPicks,
  summarizeRankRangeMods,
} from './beatmapStatsHelpers';
import { KeyTypeSchema, resolveBeatmapId } from './shared/keyType';

/** Verified scores surfaced by the beatmap page's score table. */
const TOP_PERFORMER_LIMIT = 25;

/** Deterministic cap on the score scatter sample. */
const SCORE_SAMPLE_LIMIT = 1000;

/** Mod groups below this many verified scores are noise for a box plot. */
const SCORE_DISTRIBUTION_MIN_GROUP_SIZE = 5;

const NIGHTCORE_SQL = sql.raw(String(Mods.Nightcore));
const DOUBLE_TIME_SQL = sql.raw(String(Mods.DoubleTime));
const STRIPPED_MODS_SQL = sql.raw(String(STRIPPED_SCORE_MODS_MASK));

/**
 * SQL mirror of normalizeScoreModsArithmetic / normalizeBeatmapDisplayMods —
 * keep in sync (see the beatmapModNormalization parity test).
 */
const NORMALIZED_SCORE_MODS_SQL = sql<number>`
  CASE
    WHEN (${schema.gameScores.mods} & ${NIGHTCORE_SQL}) <> 0
      THEN ((${schema.gameScores.mods} & ~(${NIGHTCORE_SQL} | ${STRIPPED_MODS_SQL})) | ${DOUBLE_TIME_SQL})
    ELSE (${schema.gameScores.mods} & ~${STRIPPED_MODS_SQL})
  END`;

/**
 * Ascending tier boundaries as a Postgres array literal, so `width_bucket`
 * returns an index into `tierNames`. Derived from tierData via
 * TIER_RATING_BOUNDARIES; the TS mirror is `tierNameFromRatingArithmetic`.
 */
const TIER_BOUNDARIES_SQL = sql.raw(
  `ARRAY[${TIER_RATING_BOUNDARIES.join(',')}]::float8[]`
);

const roundToOneDecimal = (value: number): number =>
  Math.round(value * 10) / 10;

const playerCompactColumns = {
  id: schema.players.id,
  osuId: schema.players.osuId,
  username: schema.players.username,
  country: schema.players.country,
  defaultRuleset: schema.players.defaultRuleset,
} as const;

export const getBeatmapStats = publicProcedure
  .input(
    z.object({
      id: z.number().int().positive(),
      keyType: KeyTypeSchema,
    })
  )
  .output(BeatmapStatsResponseSchema)
  .route({
    summary: 'Get beatmap statistics',
    description:
      'Fetch beatmap statistics by ID.\n\n' +
      '**Examples:**\n' +
      '- By o!TR ID: `GET /beatmaps/123/stats`\n' +
      '- By osu! ID: `GET /beatmaps/4504101/stats?keyType=osu`',
    tags: ['public'],
    method: 'GET',
    path: '/beatmaps/{id}/stats',
  })
  .handler(async ({ input, context }) => {
    try {
      const beatmapId = await resolveBeatmapId(
        context.db,
        input.id,
        input.keyType
      );

      // Verified at every level: tournament, match, game (and, where scores
      // are involved, score). Matches the filter chain used by the original
      // queries below.
      const verifiedGameFilter = and(
        eq(schema.games.beatmapId, beatmapId),
        eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
        eq(schema.matches.verificationStatus, VerificationStatus.Verified),
        eq(schema.games.verificationStatus, VerificationStatus.Verified)
      );
      const verifiedScoreFilter = and(
        verifiedGameFilter,
        eq(schema.gameScores.verificationStatus, VerificationStatus.Verified)
      );

      // Per-game relative winning margin for verified TeamVs games with
      // exactly two rosters: (winning - losing) / winning * 100. A winning
      // score of 0 yields NULL (filtered out of the aggregate).
      const teamVsMargins = context.db
        .select({
          marginPct: sql<
            number | null
          >`(MAX(${schema.gameRosters.score}) - MIN(${schema.gameRosters.score}))::float / NULLIF(MAX(${schema.gameRosters.score}), 0) * 100`.as(
            'margin_pct'
          ),
        })
        .from(schema.gameRosters)
        .innerJoin(schema.games, eq(schema.games.id, schema.gameRosters.gameId))
        .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
        .innerJoin(
          schema.tournaments,
          eq(schema.tournaments.id, schema.matches.tournamentId)
        )
        .where(
          and(verifiedGameFilter, eq(schema.games.teamType, TeamType.TeamVs))
        )
        .groupBy(schema.games.id)
        .having(sql`COUNT(*) = 2`)
        .as('margins');

      const teamVsMarginBucketCount = (bucketIndex: number) => {
        const { lowerBound, upperBound } =
          TEAM_VS_MARGIN_BUCKET_BOUNDS[bucketIndex];
        return upperBound == null
          ? sql<number>`COUNT(*) FILTER (WHERE ${teamVsMargins.marginPct} >= ${lowerBound})`
          : sql<number>`COUNT(*) FILTER (WHERE ${teamVsMargins.marginPct} >= ${lowerBound} AND ${teamVsMargins.marginPct} < ${upperBound})`;
      };

      const [
        beatmapRow,
        creatorsRows,
        summaryRow,
        totalPlayedSummaryRow,
        poolingRow,
        usageRows,
        tournamentRows,
        avgRows,
        modRows,
        topPerformerRows,
        tournamentGameModRows,
        scoreDistributionRows,
        scoreCdfRows,
        scoreSampleRows,
        performanceCountRows,
        missBucketRows,
        gradeCountRows,
        freemodPickRows,
        rankRangeModRows,
        tierBreakdownRows,
        teamVsMarginRows,
      ] = await Promise.all([
        context.db
          .select({
            id: schema.beatmaps.id,
            osuId: schema.beatmaps.osuId,
            ruleset: schema.beatmaps.ruleset,
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
            beatmapsetId: schema.beatmaps.beatmapsetId,
            dataFetchStatus: schema.beatmaps.dataFetchStatus,
            beatmapsetOsuId: schema.beatmapsets.osuId,
            artist: schema.beatmapsets.artist,
            title: schema.beatmapsets.title,
            creatorId: schema.beatmapsets.creatorId,
            creatorOsuId: schema.players.osuId,
            creatorUsername: schema.players.username,
            creatorCountry: schema.players.country,
            creatorDefaultRuleset: schema.players.defaultRuleset,
          })
          .from(schema.beatmaps)
          .leftJoin(
            schema.beatmapsets,
            eq(schema.beatmaps.beatmapsetId, schema.beatmapsets.id)
          )
          .leftJoin(
            schema.players,
            eq(schema.beatmapsets.creatorId, schema.players.id)
          )
          .where(eq(schema.beatmaps.id, beatmapId))
          .limit(1),
        context.db
          .select(playerCompactColumns)
          .from(schema.joinBeatmapCreators)
          .innerJoin(
            schema.players,
            eq(schema.joinBeatmapCreators.creatorsId, schema.players.id)
          )
          .where(eq(schema.joinBeatmapCreators.createdBeatmapsId, beatmapId)),
        context.db
          .select({
            totalGameCount: sql<number>`COUNT(DISTINCT ${schema.games.id})`,
            totalPlayerCount: sql<number>`COUNT(DISTINCT ${schema.gameScores.playerId})`,
            firstPlayedAt: sql<string>`MIN(${schema.games.startTime})`,
            lastPlayedAt: sql<string>`MAX(${schema.games.startTime})`,
          })
          .from(schema.games)
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .leftJoin(
            schema.gameScores,
            and(
              eq(schema.gameScores.gameId, schema.games.id),
              eq(
                schema.gameScores.verificationStatus,
                VerificationStatus.Verified
              )
            )
          )
          .where(
            and(
              eq(schema.games.beatmapId, beatmapId),
              eq(
                schema.tournaments.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(
                schema.matches.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(schema.games.verificationStatus, VerificationStatus.Verified)
            )
          ),
        context.db
          .select({
            totalGameCount: sql<number>`COUNT(DISTINCT ${schema.games.id})`,
          })
          .from(schema.games)
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(eq(schema.games.beatmapId, beatmapId)),
        // Pool records and the subset of them the beatmap was actually played
        // in. Neither side filters on verification: the question is how often a
        // pick happened at all, so both the numerator and the denominator have
        // to count every tournament that recorded the map in its pool.
        context.db
          .select({
            totalTournamentCount: sql<number>`COUNT(DISTINCT ${schema.joinPooledBeatmaps.tournamentsPooledInId})`,
            playedTournamentCount: sql<number>`COUNT(DISTINCT ${schema.joinPooledBeatmaps.tournamentsPooledInId}) FILTER (WHERE ${schema.games.id} IS NOT NULL)`,
          })
          .from(schema.joinPooledBeatmaps)
          .innerJoin(
            schema.tournaments,
            eq(
              schema.tournaments.id,
              schema.joinPooledBeatmaps.tournamentsPooledInId
            )
          )
          .leftJoin(
            schema.matches,
            eq(schema.matches.tournamentId, schema.tournaments.id)
          )
          .leftJoin(
            schema.games,
            and(
              eq(schema.games.matchId, schema.matches.id),
              eq(schema.games.beatmapId, beatmapId)
            )
          )
          .where(eq(schema.joinPooledBeatmaps.pooledBeatmapsId, beatmapId)),
        context.db
          .select({
            quarter: sql<string>`TO_CHAR(${schema.games.startTime}, 'YYYY-"Q"Q')`,
            gameCount: sql<number>`COUNT(DISTINCT ${schema.games.id})`,
          })
          .from(schema.games)
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(
            and(
              eq(schema.games.beatmapId, beatmapId),
              eq(
                schema.tournaments.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(
                schema.matches.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(schema.games.verificationStatus, VerificationStatus.Verified)
            )
          )
          .groupBy(sql`TO_CHAR(${schema.games.startTime}, 'YYYY-"Q"Q')`)
          .orderBy(sql`TO_CHAR(${schema.games.startTime}, 'YYYY-"Q"Q')`),
        context.db
          .select({
            tournamentId: schema.tournaments.id,
            tournamentName: schema.tournaments.name,
            tournamentAbbreviation: schema.tournaments.abbreviation,
            tournamentRuleset: schema.tournaments.ruleset,
            tournamentLobbySize: schema.tournaments.lobbySize,
            tournamentStartTime: schema.tournaments.startTime,
            tournamentEndTime: schema.tournaments.endTime,
            tournamentVerificationStatus: schema.tournaments.verificationStatus,
            tournamentIsLazer: schema.tournaments.isLazer,
            tournamentRankRangeLowerBound:
              schema.tournaments.rankRangeLowerBound,
            gameCount: sql<number>`COUNT(DISTINCT ${schema.games.id})`,
            firstPlayedAt: sql<string>`MIN(${schema.games.startTime})`,
          })
          .from(schema.joinPooledBeatmaps)
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
              eq(schema.games.matchId, schema.matches.id),
              eq(schema.games.beatmapId, beatmapId),
              eq(schema.games.verificationStatus, VerificationStatus.Verified)
            )
          )
          .where(eq(schema.joinPooledBeatmaps.pooledBeatmapsId, beatmapId))
          .groupBy(
            schema.tournaments.id,
            schema.tournaments.name,
            schema.tournaments.abbreviation,
            schema.tournaments.ruleset,
            schema.tournaments.lobbySize,
            schema.tournaments.startTime,
            schema.tournaments.endTime,
            schema.tournaments.verificationStatus,
            schema.tournaments.isLazer,
            schema.tournaments.rankRangeLowerBound
          )
          .orderBy(desc(sql`COUNT(DISTINCT ${schema.games.id})`)),
        context.db
          .select({
            tournamentId: schema.tournaments.id,
            avgScore: sql<number>`AVG(${schema.gameScores.score})`,
            // Pre-match ratings only, so the figure is a true point-in-time
            // lobby strength; null when the processor has no adjustment.
            avgRating: sql<number>`AVG(${schema.ratingAdjustments.ratingBefore})`,
            scoreCount: sql<number>`COUNT(*)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .leftJoin(
            schema.ratingAdjustments,
            and(
              eq(schema.ratingAdjustments.playerId, schema.gameScores.playerId),
              eq(schema.ratingAdjustments.matchId, schema.matches.id)
            )
          )
          .where(
            and(
              eq(schema.games.beatmapId, beatmapId),
              eq(
                schema.tournaments.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(
                schema.matches.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(schema.games.verificationStatus, VerificationStatus.Verified),
              eq(
                schema.gameScores.verificationStatus,
                VerificationStatus.Verified
              )
            )
          )
          .groupBy(schema.tournaments.id),
        context.db
          .select({
            mods: schema.gameScores.mods,
            scoreCount: sql<number>`COUNT(*)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(
            and(
              eq(schema.games.beatmapId, beatmapId),
              eq(
                schema.tournaments.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(
                schema.matches.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(schema.games.verificationStatus, VerificationStatus.Verified),
              eq(
                schema.gameScores.verificationStatus,
                VerificationStatus.Verified
              )
            )
          )
          .groupBy(schema.gameScores.mods)
          .orderBy(desc(sql`COUNT(*)`)),
        context.db
          .select({
            playerId: schema.players.id,
            playerOsuId: schema.players.osuId,
            playerUsername: schema.players.username,
            playerCountry: schema.players.country,
            playerDefaultRuleset: schema.players.defaultRuleset,
            score: schema.gameScores.score,
            grade: schema.gameScores.grade,
            accuracy: schema.gameScores.accuracy,
            mods: schema.gameScores.mods,
            playedAt: schema.games.startTime,
            matchId: schema.matches.id,
            gameId: schema.games.id,
            scoreId: schema.gameScores.id,
            tournamentId: schema.tournaments.id,
            tournamentName: schema.tournaments.name,
            tournamentAbbreviation: schema.tournaments.abbreviation,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .innerJoin(
            schema.players,
            eq(schema.players.id, schema.gameScores.playerId)
          )
          .where(
            and(
              eq(schema.games.beatmapId, beatmapId),
              eq(
                schema.tournaments.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(
                schema.matches.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(schema.games.verificationStatus, VerificationStatus.Verified),
              eq(
                schema.gameScores.verificationStatus,
                VerificationStatus.Verified
              )
            )
          )
          .orderBy(desc(schema.gameScores.score))
          .limit(TOP_PERFORMER_LIMIT),
        context.db
          .select({
            tournamentId: schema.tournaments.id,
            gameId: schema.games.id,
            gameMods: schema.games.mods,
            scoreMods: sql<
              (number | null)[]
            >`ARRAY_AGG(DISTINCT ${schema.gameScores.mods}) FILTER (WHERE ${schema.gameScores.mods} IS NOT NULL)`,
          })
          .from(schema.games)
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .leftJoin(
            schema.gameScores,
            and(
              eq(schema.gameScores.gameId, schema.games.id),
              eq(
                schema.gameScores.verificationStatus,
                VerificationStatus.Verified
              )
            )
          )
          .where(
            and(
              eq(schema.games.beatmapId, beatmapId),
              eq(
                schema.tournaments.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(
                schema.matches.verificationStatus,
                VerificationStatus.Verified
              ),
              eq(schema.games.verificationStatus, VerificationStatus.Verified)
            )
          )
          .groupBy(schema.tournaments.id, schema.games.id, schema.games.mods)
          .orderBy(asc(schema.games.id)),
        // Quartile summary of verified scores per normalized mod combination.
        context.db
          .select({
            mods: NORMALIZED_SCORE_MODS_SQL.as('normalized_mods'),
            scoreCount: sql<number>`COUNT(*)`,
            minScore: sql<number>`MIN(${schema.gameScores.score})`,
            p25Score: sql<number>`PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${schema.gameScores.score})`,
            medianScore: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${schema.gameScores.score})`,
            p75Score: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${schema.gameScores.score})`,
            maxScore: sql<number>`MAX(${schema.gameScores.score})`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(verifiedScoreFilter)
          .groupBy(sql`normalized_mods`)
          .having(
            sql`COUNT(*) >= ${sql.raw(String(SCORE_DISTRIBUTION_MIN_GROUP_SIZE))}`
          )
          .orderBy(desc(sql`COUNT(*)`), asc(sql`normalized_mods`)),
        // Score CDF: one interpolated quantile per whole percentile, 0..100.
        context.db
          .select({
            scores: sql<
              number[] | null
            >`PERCENTILE_CONT((SELECT ARRAY_AGG(g / 100.0 ORDER BY g) FROM generate_series(0, 100) AS g)) WITHIN GROUP (ORDER BY ${schema.gameScores.score})`,
            scoreCount: sql<number>`COUNT(*)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(verifiedScoreFilter),
        // Deterministic pseudo-random scatter sample. Ratings are pre-match
        // (rating_before) only; null when the processor has no adjustment.
        context.db
          .select({
            scoreId: schema.gameScores.id,
            score: schema.gameScores.score,
            accuracy: schema.gameScores.accuracy,
            mods: schema.gameScores.mods,
            rating: schema.ratingAdjustments.ratingBefore,
            rankRangeLowerBound: schema.tournaments.rankRangeLowerBound,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .leftJoin(
            schema.ratingAdjustments,
            and(
              eq(schema.ratingAdjustments.playerId, schema.gameScores.playerId),
              eq(schema.ratingAdjustments.matchId, schema.matches.id)
            )
          )
          .where(verifiedScoreFilter)
          .orderBy(sql`md5(${schema.gameScores.id}::text)`)
          .limit(SCORE_SAMPLE_LIMIT),
        // Miss-data scalar counts.
        context.db
          .select({
            scoreCount: sql<number>`COUNT(*)`,
            missDataScoreCount: sql<number>`COUNT(*) FILTER (WHERE ${schema.gameScores.statMiss} IS NOT NULL)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(verifiedScoreFilter),
        // Miss buckets (5 = "5 or more"), only where miss data exists.
        context.db
          .select({
            misses: sql<number>`LEAST(${schema.gameScores.statMiss}, 5)`.as(
              'misses'
            ),
            scoreCount: sql<number>`COUNT(*)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(
            and(
              verifiedScoreFilter,
              sql`${schema.gameScores.statMiss} IS NOT NULL`
            )
          )
          .groupBy(sql`misses`)
          .orderBy(asc(sql`misses`)),
        // Grade counts by persisted ScoreGrade ordinal.
        context.db
          .select({
            grade: schema.gameScores.grade,
            scoreCount: sql<number>`COUNT(*)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(verifiedScoreFilter)
          .groupBy(schema.gameScores.grade)
          .orderBy(asc(schema.gameScores.grade)),
        // Distinct (game, game mods, score mods) rows; freemod detection stays
        // in TS via deriveGameIsFreeMod so the convention matches everywhere.
        context.db
          .select({
            gameId: schema.games.id,
            gameMods: schema.games.mods,
            scoreMods: schema.gameScores.mods,
            scoreCount: sql<number>`COUNT(*)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(verifiedScoreFilter)
          .groupBy(schema.games.id, schema.games.mods, schema.gameScores.mods)
          .orderBy(asc(schema.games.id), asc(schema.gameScores.mods)),
        // Verified scores per (raw rank-range lower bound, normalized mods).
        // Bucketing stays in TS (summarizeRankRangeMods) so the bracket
        // definitions live in exactly one place.
        context.db
          .select({
            rankRangeLowerBound: schema.tournaments.rankRangeLowerBound,
            mods: NORMALIZED_SCORE_MODS_SQL.as('normalized_mods'),
            scoreCount: sql<number>`COUNT(*)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .where(verifiedScoreFilter)
          .groupBy(
            schema.tournaments.rankRangeLowerBound,
            sql`normalized_mods`
          ),
        // Score/accuracy quartiles per rating tier, tiered by the player's
        // pre-match rating. INNER JOIN on rating_adjustments: unrated scores
        // are excluded outright rather than falling back to player_ratings.
        context.db
          .select({
            tierIndex:
              sql<number>`width_bucket(${schema.ratingAdjustments.ratingBefore}, ${TIER_BOUNDARIES_SQL})`.as(
                'tier_index'
              ),
            scoreCount: sql<number>`COUNT(*)`,
            minScore: sql<number>`MIN(${schema.gameScores.score})`,
            p25Score: sql<number>`PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${schema.gameScores.score})`,
            medianScore: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${schema.gameScores.score})`,
            p75Score: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${schema.gameScores.score})`,
            maxScore: sql<number>`MAX(${schema.gameScores.score})`,
            medianAccuracy: sql<
              number | null
            >`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${schema.gameScores.accuracy}) FILTER (WHERE ${schema.gameScores.accuracy} IS NOT NULL)`,
          })
          .from(schema.gameScores)
          .innerJoin(
            schema.games,
            eq(schema.games.id, schema.gameScores.gameId)
          )
          .innerJoin(
            schema.matches,
            eq(schema.matches.id, schema.games.matchId)
          )
          .innerJoin(
            schema.tournaments,
            eq(schema.tournaments.id, schema.matches.tournamentId)
          )
          .innerJoin(
            schema.ratingAdjustments,
            and(
              eq(schema.ratingAdjustments.playerId, schema.gameScores.playerId),
              eq(schema.ratingAdjustments.matchId, schema.matches.id)
            )
          )
          .where(verifiedScoreFilter)
          .groupBy(sql`tier_index`)
          .orderBy(asc(sql`tier_index`)),
        // Team-vs closeness: median margin plus fixed bucket counts.
        context.db
          .select({
            gameCount: sql<number>`COUNT(*) FILTER (WHERE ${teamVsMargins.marginPct} IS NOT NULL)`,
            medianMargin: sql<
              number | null
            >`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${teamVsMargins.marginPct})`,
            bucket0: teamVsMarginBucketCount(0),
            bucket1: teamVsMarginBucketCount(1),
            bucket2: teamVsMarginBucketCount(2),
            bucket3: teamVsMarginBucketCount(3),
            bucket4: teamVsMarginBucketCount(4),
            bucket5: teamVsMarginBucketCount(5),
            bucket6: teamVsMarginBucketCount(6),
          })
          .from(teamVsMargins),
      ]);

      const beatmap = beatmapRow[0]!;

      const relatedDifficultyRows = await getRelatedBeatmapDifficulties(
        context.db,
        beatmap.beatmapsetId
      );

      const creators = creatorsRows.map((row) => ({
        id: row.id,
        osuId: row.osuId,
        username: row.username,
        country: row.country,
        defaultRuleset: row.defaultRuleset as Ruleset,
      }));

      const summary = {
        totalGameCount: Number(summaryRow[0]?.totalGameCount ?? 0),
        totalTournamentCount: Number(poolingRow[0]?.totalTournamentCount ?? 0),
        totalPlayedGameCount: Number(
          totalPlayedSummaryRow[0]?.totalGameCount ?? 0
        ),
        pooledPlayedTournamentCount: Number(
          poolingRow[0]?.playedTournamentCount ?? 0
        ),
        totalPlayerCount: Number(summaryRow[0]?.totalPlayerCount ?? 0),
        firstPlayedAt: summaryRow[0]?.firstPlayedAt ?? null,
        lastPlayedAt: summaryRow[0]?.lastPlayedAt ?? null,
      };

      // Helper to get quarter string from date
      const getQuarterKey = (date: Date): string => {
        const year = date.getFullYear();
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `${year}-Q${quarter}`;
      };

      // Count each tournament in the quarter when the beatmap was first played
      // (or fall back to tournament start date if never played)
      const poolingByQuarter = new Map<string, Set<number>>();
      for (const t of tournamentRows) {
        const dateToUse = t.firstPlayedAt
          ? new Date(t.firstPlayedAt)
          : t.tournamentStartTime
            ? new Date(t.tournamentStartTime)
            : null;

        if (!dateToUse) continue;

        const quarterKey = getQuarterKey(dateToUse);
        if (!poolingByQuarter.has(quarterKey)) {
          poolingByQuarter.set(quarterKey, new Set());
        }
        poolingByQuarter.get(quarterKey)!.add(t.tournamentId);
      }

      // Convert Sets to counts
      const poolingCounts = new Map<string, number>();
      for (const [quarter, tournamentIds] of poolingByQuarter) {
        poolingCounts.set(quarter, tournamentIds.size);
      }

      const usageByQuarter = new Map<string, number>();
      for (const row of usageRows) {
        usageByQuarter.set(row.quarter, Number(row.gameCount));
      }

      const allQuarters = new Set([
        ...usageRows.map((r) => r.quarter),
        ...poolingCounts.keys(),
      ]);

      // Helper to parse quarter string
      const parseQuarter = (q: string): [number, number] => {
        const [year, qNum] = q.split('-Q');
        return [parseInt(year, 10), parseInt(qNum, 10)];
      };

      const usageOverTime: BeatmapUsagePoint[] = [];
      if (allQuarters.size > 0) {
        const sortedQuarters = Array.from(allQuarters).sort();
        const [startYear, startQ] = parseQuarter(sortedQuarters[0]);
        const [lastYear, lastQ] = parseQuarter(
          sortedQuarters[sortedQuarters.length - 1]
        );

        // Always run the series through the current quarter so idle periods
        // after the last recorded usage remain visible as empty bars.
        const [currentYear, currentQ] = parseQuarter(getQuarterKey(new Date()));
        const [endYear, endQ] =
          currentYear > lastYear ||
          (currentYear === lastYear && currentQ > lastQ)
            ? [currentYear, currentQ]
            : [lastYear, lastQ];

        let year = startYear;
        let q = startQ;
        while (year < endYear || (year === endYear && q <= endQ)) {
          const quarterKey = `${year}-Q${q}`;
          usageOverTime.push({
            quarter: quarterKey,
            gameCount: usageByQuarter.get(quarterKey) ?? 0,
            pooledCount: poolingCounts.get(quarterKey) ?? 0,
          });
          q++;
          if (q > 4) {
            q = 1;
            year++;
          }
        }
      }

      const avgMap = new Map(
        avgRows.map((row) => [
          row.tournamentId,
          {
            avgScore: row.avgScore ? Math.round(row.avgScore) : null,
            avgRating: row.avgRating ? Math.round(row.avgRating) : null,
            scoreCount: Number(row.scoreCount),
          },
        ])
      );

      // Resolve the most common mod per tournament from the mods players
      // actually used (score-level), so freemod lobbies whose games record no
      // mods don't report NM. See resolveGameModsFromScores / ModIconset.
      const modsByTournament = new Map<
        number,
        Array<{ mods: Mods; scoreMods: number[] }>
      >();
      for (const row of tournamentGameModRows) {
        const games = modsByTournament.get(row.tournamentId) ?? [];
        games.push({
          mods: row.gameMods,
          scoreMods: (row.scoreMods ?? [])
            .filter((m): m is number => m != null)
            .map(Number),
        });
        modsByTournament.set(row.tournamentId, games);
      }

      const tournaments: BeatmapTournamentUsage[] = tournamentRows.map(
        (row) => {
          const avgs = avgMap.get(row.tournamentId);
          const commonMod = mostCommonDisplayMods(
            modsByTournament.get(row.tournamentId) ?? []
          );
          return {
            tournament: {
              id: row.tournamentId,
              name: row.tournamentName,
              abbreviation: row.tournamentAbbreviation,
              ruleset: row.tournamentRuleset as Ruleset,
              lobbySize: row.tournamentLobbySize,
              startTime: row.tournamentStartTime,
              endTime: row.tournamentEndTime,
              verificationStatus:
                row.tournamentVerificationStatus as VerificationStatus,
              isLazer: row.tournamentIsLazer,
            },
            gameCount: Number(row.gameCount),
            scoreCount: avgs?.scoreCount ?? 0,
            mostCommonMod: commonMod.mods,
            mostCommonModFreemod: commonMod.freemod,
            firstPlayedAt: row.firstPlayedAt,
            rankRangeLowerBound: row.tournamentRankRangeLowerBound,
            avgRating: avgs?.avgRating ?? null,
            avgScore: avgs?.avgScore ?? null,
          };
        }
      );

      const totalModScores = modRows.reduce(
        (acc, row) => acc + Number(row.scoreCount),
        0
      );
      const modDistribution: BeatmapModDistribution[] = modRows.map((row) => ({
        mods: row.mods,
        scoreCount: Number(row.scoreCount),
        percentage:
          totalModScores > 0
            ? (Number(row.scoreCount) / totalModScores) * 100
            : 0,
      }));

      const topPerformers: BeatmapTopPerformer[] = topPerformerRows.map(
        (row) => ({
          player: {
            id: row.playerId,
            osuId: row.playerOsuId,
            username: row.playerUsername,
            country: row.playerCountry,
            defaultRuleset: row.playerDefaultRuleset as Ruleset,
          },
          score: row.score,
          grade: row.grade,
          accuracy: row.accuracy ?? null,
          mods: row.mods,
          playedAt: row.playedAt,
          matchId: row.matchId,
          gameId: row.gameId,
          scoreId: row.scoreId,
          tournament: {
            id: row.tournamentId,
            name: row.tournamentName,
            abbreviation: row.tournamentAbbreviation,
          },
        })
      );

      const scoreDistribution: BeatmapModScoreDistribution[] =
        scoreDistributionRows.map((row) => ({
          mods: Number(row.mods),
          scoreCount: Number(row.scoreCount),
          minScore: Number(row.minScore),
          p25Score: Math.round(Number(row.p25Score)),
          medianScore: Math.round(Number(row.medianScore)),
          p75Score: Math.round(Number(row.p75Score)),
          maxScore: Number(row.maxScore),
        }));

      const cdfRow = scoreCdfRows[0];
      const totalScoreCount = Number(cdfRow?.scoreCount ?? 0);
      const scorePercentiles: BeatmapScorePercentilePoint[] =
        totalScoreCount > 0 && cdfRow?.scores != null
          ? cdfRow.scores.map((score, percentile) => ({
              percentile,
              score: Math.round(Number(score)),
            }))
          : [];

      const scoreSample: BeatmapScoreSample = {
        totalScoreCount,
        points: [...scoreSampleRows]
          .sort((left, right) => left.scoreId - right.scoreId)
          .map((row) => ({
            score: row.score,
            accuracy: Math.min(100, Math.max(0, row.accuracy)),
            // Pre-match rating only; null is expected on recent data. Never
            // fall back to the player's current rating here.
            rating: row.rating != null ? Number(row.rating) : null,
            mods: row.mods,
            // The schema guarantees a positive bound, so the fallback is
            // unreachable; it only keeps the mapping total.
            rankRange: getRankRangeBucketKey(row.rankRangeLowerBound) ?? 'open',
          })),
      };

      const performanceCounts = performanceCountRows[0];
      const performance: BeatmapPerformanceSummary = {
        scoreCount: Number(performanceCounts?.scoreCount ?? 0),
        missDataScoreCount: Number(performanceCounts?.missDataScoreCount ?? 0),
        missDistribution: missBucketRows.map((row) => ({
          misses: Number(row.misses),
          scoreCount: Number(row.scoreCount),
        })),
        gradeDistribution: gradeCountRows.map((row) => ({
          grade: row.grade,
          scoreCount: Number(row.scoreCount),
        })),
      };

      const freemodPicks = summarizeFreemodPicks(
        freemodPickRows.map((row) => ({
          gameId: row.gameId,
          gameMods: row.gameMods,
          scoreMods: row.scoreMods,
          scoreCount: Number(row.scoreCount),
        }))
      );

      const rankRangeModDistribution = summarizeRankRangeMods(
        rankRangeModRows.map((row) => ({
          rankRangeLowerBound: row.rankRangeLowerBound,
          mods: Number(row.mods),
          scoreCount: Number(row.scoreCount),
        }))
      );

      // width_bucket returns 0..8, indexing tierNames directly (0 = Bronze,
      // covering everything below the first boundary). Sparse tiers are hidden
      // from the rows but still counted in ratedScoreCount.
      let ratedScoreCount = 0;
      const tiers: BeatmapTierScoreSummary[] = [];
      for (const row of tierBreakdownRows) {
        const scoreCount = Number(row.scoreCount);
        ratedScoreCount += scoreCount;

        if (scoreCount < SCORE_DISTRIBUTION_MIN_GROUP_SIZE) continue;

        const tier = tierNames[Number(row.tierIndex)];
        if (tier == null) continue;

        tiers.push({
          tier,
          scoreCount,
          minScore: Number(row.minScore),
          p25Score: Math.round(Number(row.p25Score)),
          medianScore: Math.round(Number(row.medianScore)),
          p75Score: Math.round(Number(row.p75Score)),
          maxScore: Number(row.maxScore),
          // Stored as a 0–1 fraction, passed through unrounded; clamped so a
          // malformed row cannot fail the response schema.
          medianAccuracy:
            row.medianAccuracy != null
              ? Math.min(1, Math.max(0, Number(row.medianAccuracy)))
              : null,
        });
      }

      const tierBreakdown: BeatmapTierBreakdown = {
        ratedScoreCount,
        totalScoreCount,
        tiers,
      };

      const marginRow = teamVsMarginRows[0];
      const teamVsGameCount = Number(marginRow?.gameCount ?? 0);
      const marginBucketCounts = [
        Number(marginRow?.bucket0 ?? 0),
        Number(marginRow?.bucket1 ?? 0),
        Number(marginRow?.bucket2 ?? 0),
        Number(marginRow?.bucket3 ?? 0),
        Number(marginRow?.bucket4 ?? 0),
        Number(marginRow?.bucket5 ?? 0),
        Number(marginRow?.bucket6 ?? 0),
      ];
      const teamVsMarginSummary: BeatmapTeamVsMarginSummary = {
        gameCount: teamVsGameCount,
        // Null check, not truthiness: a true median margin of 0 is valid.
        medianMarginPercentage:
          marginRow?.medianMargin != null
            ? roundToOneDecimal(Number(marginRow.medianMargin))
            : null,
        buckets: TEAM_VS_MARGIN_BUCKET_BOUNDS.map((bounds, index) => ({
          lowerBound: bounds.lowerBound,
          upperBound: bounds.upperBound,
          gameCount: marginBucketCounts[index],
        })),
      };

      const response: BeatmapStatsResponse = {
        beatmap: {
          id: beatmap.id,
          osuId: beatmap.osuId,
          ruleset: beatmap.ruleset as Ruleset,
          rankedStatus: beatmap.rankedStatus,
          diffName: beatmap.diffName,
          totalLength: beatmap.totalLength,
          drainLength: beatmap.drainLength,
          bpm: beatmap.bpm,
          countCircle: beatmap.countCircle,
          countSlider: beatmap.countSlider,
          countSpinner: beatmap.countSpinner,
          cs: beatmap.cs,
          hp: beatmap.hp,
          od: beatmap.od,
          ar: beatmap.ar,
          sr: beatmap.sr,
          maxCombo: beatmap.maxCombo,
          beatmapsetId: beatmap.beatmapsetId,
          dataFetchStatus: beatmap.dataFetchStatus,
          beatmapset: beatmap.beatmapsetOsuId
            ? {
                id: beatmap.beatmapsetId!,
                osuId: beatmap.beatmapsetOsuId,
                artist: beatmap.artist ?? 'Unknown',
                title: beatmap.title ?? 'Unknown',
                creatorId: beatmap.creatorId,
                rankedStatus: beatmap.rankedStatus,
                rankedDate: null,
                submittedDate: null,
                creator:
                  beatmap.creatorId && beatmap.creatorOsuId
                    ? {
                        id: beatmap.creatorId,
                        osuId: beatmap.creatorOsuId,
                        username: beatmap.creatorUsername ?? 'Unknown',
                        country: beatmap.creatorCountry ?? '',
                        defaultRuleset: (beatmap.creatorDefaultRuleset ??
                          Ruleset.Osu) as Ruleset,
                      }
                    : null,
              }
            : null,
          creators,
        },
        relatedDifficulties: relatedDifficultyRows.map((difficulty) => ({
          osuId: difficulty.osuId,
          diffName: difficulty.diffName,
          ruleset: difficulty.ruleset as Ruleset,
          sr: difficulty.sr,
        })),
        summary,
        usageOverTime,
        tournaments,
        modDistribution,
        topPerformers,
        scoreDistribution,
        scorePercentiles,
        scoreSample,
        performance,
        freemodPicks,
        rankRangeModDistribution,
        tierBreakdown,
        teamVsMargins: teamVsMarginSummary,
      };

      return BeatmapStatsResponseSchema.parse(response);
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }

      console.error(
        '[orpc] beatmaps.stats failed',
        { beatmapId: input.id },
        error
      );

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to load beatmap statistics',
      });
    }
  });

export const getBeatmapTournamentMatches = publicProcedure
  .input(
    z.object({
      beatmapId: z.number().int().positive(),
      keyType: KeyTypeSchema,
      tournamentId: z.number().int().positive(),
    })
  )
  .output(BeatmapTournamentMatchResponseSchema)
  .route({
    summary: 'Get matches where a beatmap was used in a tournament',
    description:
      'Fetch matches where a beatmap was played in a specific tournament.\n\n' +
      '**Examples:**\n' +
      '- By o!TR ID: `GET /beatmaps/123/tournaments/456/matches`\n' +
      '- By osu! ID: `GET /beatmaps/4504101/tournaments/456/matches?keyType=osu`',
    tags: ['public'],
    method: 'GET',
    path: '/beatmaps/{beatmapId}/tournaments/{tournamentId}/matches',
  })
  .handler(async ({ input, context }) => {
    try {
      const beatmapId = await resolveBeatmapId(
        context.db,
        input.beatmapId,
        input.keyType
      );

      const rows = await context.db
        .select({
          matchId: schema.matches.id,
          matchName: schema.matches.name,
          matchStartTime: schema.matches.startTime,
          gameId: schema.games.id,
          gameMods: schema.games.mods,
        })
        .from(schema.games)
        .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
        .where(
          and(
            eq(schema.games.beatmapId, beatmapId),
            eq(schema.matches.tournamentId, input.tournamentId),
            eq(schema.matches.verificationStatus, VerificationStatus.Verified),
            eq(schema.games.verificationStatus, VerificationStatus.Verified)
          )
        )
        .orderBy(
          asc(schema.matches.startTime),
          asc(schema.matches.id),
          asc(schema.games.startTime),
          asc(schema.games.id)
        );

      const matchIds = [...new Set(rows.map((r) => r.matchId))];

      const allMatchGames =
        matchIds.length > 0
          ? await context.db
              .select({
                matchId: schema.games.matchId,
                gameId: schema.games.id,
              })
              .from(schema.games)
              .where(
                and(
                  inArray(schema.games.matchId, matchIds),
                  eq(
                    schema.games.verificationStatus,
                    VerificationStatus.Verified
                  )
                )
              )
              .orderBy(asc(schema.games.startTime), asc(schema.games.id))
          : [];

      const gameNumberMap = new Map<number, number>();
      const gamesByMatch = new Map<number, number[]>();

      for (const game of allMatchGames) {
        const games = gamesByMatch.get(game.matchId) ?? [];
        games.push(game.gameId);
        gamesByMatch.set(game.matchId, games);
      }

      for (const [, gameIds] of gamesByMatch) {
        gameIds.forEach((gameId, index) => {
          gameNumberMap.set(gameId, index + 1);
        });
      }

      const relevantGameIds = rows.map((r) => r.gameId);
      const gameStatsRows =
        relevantGameIds.length > 0
          ? await context.db
              .select({
                gameId: schema.games.id,
                avgScore: sql<number>`AVG(${schema.gameScores.score})`,
                // Pre-match ratings only, matching the per-tournament average
                // and the "Avg rating" hint shown in the UI.
                avgRating: sql<number>`AVG(${schema.ratingAdjustments.ratingBefore})`,
                playerCount: sql<number>`COUNT(DISTINCT ${schema.gameScores.playerId})`,
                scoreMods: sql<
                  (number | null)[]
                >`ARRAY_AGG(DISTINCT ${schema.gameScores.mods})`,
              })
              .from(schema.gameScores)
              .innerJoin(
                schema.games,
                eq(schema.games.id, schema.gameScores.gameId)
              )
              .innerJoin(
                schema.matches,
                eq(schema.matches.id, schema.games.matchId)
              )
              .leftJoin(
                schema.ratingAdjustments,
                and(
                  eq(
                    schema.ratingAdjustments.playerId,
                    schema.gameScores.playerId
                  ),
                  eq(schema.ratingAdjustments.matchId, schema.matches.id)
                )
              )
              .where(
                and(
                  inArray(schema.games.id, relevantGameIds),
                  eq(
                    schema.gameScores.verificationStatus,
                    VerificationStatus.Verified
                  )
                )
              )
              .groupBy(schema.games.id)
          : [];

      const gameStatsMap = new Map(
        gameStatsRows.map((row) => [
          row.gameId,
          {
            avgScore: row.avgScore ? Math.round(row.avgScore) : null,
            avgRating: row.avgRating ? Math.round(row.avgRating) : null,
            playerCount: Number(row.playerCount),
            scoreMods: (row.scoreMods ?? [])
              .filter((m): m is number => m != null)
              .map(Number),
          },
        ])
      );

      const matchesMap = new Map<
        number,
        {
          matchId: number;
          matchName: string;
          startTime: string | null;
          games: Array<{
            gameId: number;
            gameNumber: number;
            mods: number;
            freemod: boolean;
            avgRating: number | null;
            avgScore: number | null;
            playerCount: number;
          }>;
        }
      >();

      for (const row of rows) {
        let match = matchesMap.get(row.matchId);
        if (!match) {
          match = {
            matchId: row.matchId,
            matchName: row.matchName,
            startTime: row.matchStartTime,
            games: [],
          };
          matchesMap.set(row.matchId, match);
        }

        const gameNumber = gameNumberMap.get(row.gameId) ?? 1;
        const stats = gameStatsMap.get(row.gameId);
        const displayMods = resolveGameModsFromScores(
          row.gameMods,
          stats?.scoreMods ?? []
        );
        match.games.push({
          gameId: row.gameId,
          gameNumber,
          mods: displayMods.mods,
          freemod: displayMods.freemod,
          avgRating: stats?.avgRating ?? null,
          avgScore: stats?.avgScore ?? null,
          playerCount: stats?.playerCount ?? 0,
        });
      }

      return {
        matches: Array.from(matchesMap.values()),
      };
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }

      console.error(
        '[orpc] beatmaps.tournamentMatches failed',
        { beatmapId: input.beatmapId, tournamentId: input.tournamentId },
        error
      );

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to load tournament matches',
      });
    }
  });

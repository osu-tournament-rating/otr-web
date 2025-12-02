import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { Mods, Ruleset, VerificationStatus } from '@otr/core/osu';
import {
  BeatmapStatsRequestSchema,
  BeatmapStatsResponseSchema,
  BeatmapTournamentMatchRequestSchema,
  BeatmapTournamentMatchResponseSchema,
  type BeatmapStatsResponse,
  type BeatmapTournamentUsage,
  type BeatmapUsagePoint,
  type BeatmapModDistribution,
  type BeatmapScoreRatingPoint,
  type BeatmapTopPerformer,
} from '@/lib/orpc/schema/beatmapStats';

import { publicProcedure } from './base';

const playerCompactColumns = {
  id: schema.players.id,
  osuId: schema.players.osuId,
  username: schema.players.username,
  country: schema.players.country,
  defaultRuleset: schema.players.defaultRuleset,
} as const;

export const getBeatmapStats = publicProcedure
  .input(BeatmapStatsRequestSchema)
  .output(BeatmapStatsResponseSchema)
  .route({
    summary: 'Get beatmap statistics',
    tags: ['public'],
    method: 'GET',
    path: '/beatmaps/{id}/stats',
  })
  .handler(async ({ input, context }) => {
    try {
      const resolveInternalBeatmapId = async (
        inputId: number
      ): Promise<number> => {
        const [result] = await context.db
          .select({ id: schema.beatmaps.id })
          .from(schema.beatmaps)
          .where(eq(schema.beatmaps.osuId, inputId))
          .limit(1);

        if (!result) {
          throw new ORPCError('NOT_FOUND', { message: 'Beatmap not found' });
        }

        return result.id;
      };

      const beatmapId = await resolveInternalBeatmapId(input.id);

      const beatmapRow = await context.db
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
        .limit(1);

      const beatmap = beatmapRow[0]!;

      const creatorsRows = await context.db
        .select(playerCompactColumns)
        .from(schema.joinBeatmapCreators)
        .innerJoin(
          schema.players,
          eq(schema.joinBeatmapCreators.creatorsId, schema.players.id)
        )
        .where(eq(schema.joinBeatmapCreators.createdBeatmapsId, beatmapId));

      const creators = creatorsRows.map((row) => ({
        id: row.id,
        osuId: row.osuId,
        username: row.username,
        country: row.country,
        defaultRuleset: row.defaultRuleset as Ruleset,
      }));

      const summaryRow = await context.db
        .select({
          totalGameCount: sql<number>`COUNT(DISTINCT ${schema.games.id})`,
          totalTournamentCount: sql<number>`COUNT(DISTINCT ${schema.tournaments.id})`,
          totalPlayerCount: sql<number>`COUNT(DISTINCT ${schema.gameScores.playerId})`,
          firstPlayedAt: sql<string>`MIN(${schema.games.startTime})`,
          lastPlayedAt: sql<string>`MAX(${schema.games.startTime})`,
        })
        .from(schema.games)
        .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
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
            eq(schema.matches.verificationStatus, VerificationStatus.Verified),
            eq(schema.games.verificationStatus, VerificationStatus.Verified)
          )
        );

      const summary = {
        totalGameCount: Number(summaryRow[0]?.totalGameCount ?? 0),
        totalTournamentCount: Number(summaryRow[0]?.totalTournamentCount ?? 0),
        totalPlayerCount: Number(summaryRow[0]?.totalPlayerCount ?? 0),
        firstPlayedAt: summaryRow[0]?.firstPlayedAt ?? null,
        lastPlayedAt: summaryRow[0]?.lastPlayedAt ?? null,
      };

      const usageRows = await context.db
        .select({
          quarter: sql<string>`TO_CHAR(${schema.games.startTime}, 'YYYY-"Q"Q')`,
          gameCount: sql<number>`COUNT(DISTINCT ${schema.games.id})`,
        })
        .from(schema.games)
        .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
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
            eq(schema.matches.verificationStatus, VerificationStatus.Verified),
            eq(schema.games.verificationStatus, VerificationStatus.Verified)
          )
        )
        .groupBy(sql`TO_CHAR(${schema.games.startTime}, 'YYYY-"Q"Q')`)
        .orderBy(sql`TO_CHAR(${schema.games.startTime}, 'YYYY-"Q"Q')`);

      // Get all tournaments with this beatmap pooled, with their date ranges
      const pooledTournaments = await context.db
        .select({
          tournamentId: schema.tournaments.id,
          startTime: schema.tournaments.startTime,
          endTime: schema.tournaments.endTime,
        })
        .from(schema.joinPooledBeatmaps)
        .innerJoin(
          schema.tournaments,
          eq(
            schema.tournaments.id,
            schema.joinPooledBeatmaps.tournamentsPooledInId
          )
        )
        .where(
          and(
            eq(schema.joinPooledBeatmaps.pooledBeatmapsId, beatmapId),
            eq(
              schema.tournaments.verificationStatus,
              VerificationStatus.Verified
            ),
            sql`${schema.tournaments.startTime} IS NOT NULL`
          )
        );

      // Helper to get quarter string from date
      const getQuarterKey = (date: Date): string => {
        const year = date.getFullYear();
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        return `${year}-Q${quarter}`;
      };

      // Helper to advance to next quarter
      const nextQuarter = (date: Date): Date => {
        const month = date.getMonth();
        const quarter = Math.floor(month / 3);
        if (quarter === 3) {
          return new Date(date.getFullYear() + 1, 0, 1);
        }
        return new Date(date.getFullYear(), (quarter + 1) * 3, 1);
      };

      // Expand each tournament across all quarters it spans
      const poolingByQuarter = new Map<string, Set<number>>();
      for (const t of pooledTournaments) {
        if (!t.startTime) continue;
        const start = new Date(t.startTime);
        const end = t.endTime ? new Date(t.endTime) : start;

        let current = new Date(start);
        while (current <= end) {
          const quarterKey = getQuarterKey(current);
          if (!poolingByQuarter.has(quarterKey)) {
            poolingByQuarter.set(quarterKey, new Set());
          }
          poolingByQuarter.get(quarterKey)!.add(t.tournamentId);
          current = nextQuarter(current);
        }
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
        const [endYear, endQ] = parseQuarter(
          sortedQuarters[sortedQuarters.length - 1]
        );

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

      const tournamentRows = await context.db
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
          tournamentRankRangeLowerBound: schema.tournaments.rankRangeLowerBound,
          gameCount: sql<number>`COUNT(DISTINCT ${schema.games.id})`,
          modsUsed: sql<number[]>`array_agg(${schema.games.mods})`,
          firstPlayedAt: sql<string>`MIN(${schema.games.startTime})`,
        })
        .from(schema.tournaments)
        .innerJoin(
          schema.matches,
          eq(schema.matches.tournamentId, schema.tournaments.id)
        )
        .innerJoin(schema.games, eq(schema.games.matchId, schema.matches.id))
        .where(
          and(
            eq(schema.games.beatmapId, beatmapId),
            eq(
              schema.tournaments.verificationStatus,
              VerificationStatus.Verified
            ),
            eq(schema.matches.verificationStatus, VerificationStatus.Verified),
            eq(schema.games.verificationStatus, VerificationStatus.Verified)
          )
        )
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
        .orderBy(desc(sql`COUNT(DISTINCT ${schema.games.id})`));

      const avgRows = await context.db
        .select({
          tournamentId: schema.tournaments.id,
          avgScore: sql<number>`AVG(${schema.gameScores.score})`,
          avgRating: sql<number>`AVG(COALESCE(${schema.ratingAdjustments.ratingBefore}, ${schema.ratingAdjustments.ratingAfter}))`,
        })
        .from(schema.gameScores)
        .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
        .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
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
            eq(schema.matches.verificationStatus, VerificationStatus.Verified),
            eq(schema.games.verificationStatus, VerificationStatus.Verified),
            eq(
              schema.gameScores.verificationStatus,
              VerificationStatus.Verified
            )
          )
        )
        .groupBy(schema.tournaments.id);

      const avgMap = new Map(
        avgRows.map((row) => [
          row.tournamentId,
          {
            avgScore: row.avgScore ? Math.round(row.avgScore) : null,
            avgRating: row.avgRating ? Math.round(row.avgRating) : null,
          },
        ])
      );

      const tournaments: BeatmapTournamentUsage[] = tournamentRows.map(
        (row) => {
          let mostCommonMod = Mods.None;
          if (row.modsUsed && row.modsUsed.length > 0) {
            const modCounts = new Map<number, number>();
            for (const mod of row.modsUsed) {
              if (mod == null) continue;
              modCounts.set(mod, (modCounts.get(mod) ?? 0) + 1);
            }
            let maxCount = 0;
            for (const [mod, count] of modCounts.entries()) {
              if (count > maxCount) {
                maxCount = count;
                mostCommonMod = mod;
              }
            }
          }

          const avgs = avgMap.get(row.tournamentId);
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
            mostCommonMod,
            firstPlayedAt: row.firstPlayedAt,
            rankRangeLowerBound: row.tournamentRankRangeLowerBound,
            avgRating: avgs?.avgRating ?? null,
            avgScore: avgs?.avgScore ?? null,
          };
        }
      );

      const modRows = await context.db
        .select({
          mods: schema.gameScores.mods,
          scoreCount: sql<number>`COUNT(*)`,
        })
        .from(schema.gameScores)
        .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
        .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
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
            eq(schema.matches.verificationStatus, VerificationStatus.Verified),
            eq(schema.games.verificationStatus, VerificationStatus.Verified),
            eq(
              schema.gameScores.verificationStatus,
              VerificationStatus.Verified
            )
          )
        )
        .groupBy(schema.gameScores.mods)
        .orderBy(desc(sql`COUNT(*)`));

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

      const scoreRatingRows = await context.db
        .select({
          score: schema.gameScores.score,
          playerRating: sql<number>`COALESCE(${schema.ratingAdjustments.ratingBefore}, ${schema.ratingAdjustments.ratingAfter})`,
          mods: schema.gameScores.mods,
        })
        .from(schema.gameScores)
        .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
        .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
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
        .where(
          and(
            eq(schema.games.beatmapId, beatmapId),
            eq(
              schema.tournaments.verificationStatus,
              VerificationStatus.Verified
            ),
            eq(schema.matches.verificationStatus, VerificationStatus.Verified),
            eq(schema.games.verificationStatus, VerificationStatus.Verified),
            eq(
              schema.gameScores.verificationStatus,
              VerificationStatus.Verified
            )
          )
        );

      const scoreRatingData: BeatmapScoreRatingPoint[] = scoreRatingRows.map(
        (row) => ({
          score: row.score,
          playerRating: Number(row.playerRating),
          mods: row.mods,
        })
      );

      const topPerformerRows = await context.db
        .select({
          playerId: schema.players.id,
          playerOsuId: schema.players.osuId,
          playerUsername: schema.players.username,
          playerCountry: schema.players.country,
          playerDefaultRuleset: schema.players.defaultRuleset,
          score: schema.gameScores.score,
          accuracy: schema.gameScores.accuracy,
          mods: schema.gameScores.mods,
          playedAt: schema.games.startTime,
          matchId: schema.matches.id,
          gameId: schema.games.id,
          scoreId: schema.gameScores.id,
        })
        .from(schema.gameScores)
        .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
        .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
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
            eq(schema.matches.verificationStatus, VerificationStatus.Verified),
            eq(schema.games.verificationStatus, VerificationStatus.Verified),
            eq(
              schema.gameScores.verificationStatus,
              VerificationStatus.Verified
            )
          )
        )
        .orderBy(desc(schema.gameScores.score))
        .limit(10);

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
          accuracy: row.accuracy ?? null,
          mods: row.mods,
          playedAt: row.playedAt,
          matchId: row.matchId,
          gameId: row.gameId,
          scoreId: row.scoreId,
        })
      );

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
        summary,
        usageOverTime,
        tournaments,
        modDistribution,
        scoreRatingData,
        topPerformers,
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
  .input(BeatmapTournamentMatchRequestSchema)
  .output(BeatmapTournamentMatchResponseSchema)
  .route({
    summary: 'Get matches where a beatmap was used in a tournament',
    tags: ['public'],
    method: 'GET',
    path: '/beatmaps/{beatmapOsuId}/tournaments/{tournamentId}/matches',
  })
  .handler(async ({ input, context }) => {
    try {
      const [beatmapResult] = await context.db
        .select({ id: schema.beatmaps.id })
        .from(schema.beatmaps)
        .where(eq(schema.beatmaps.osuId, input.beatmapOsuId))
        .limit(1);

      if (!beatmapResult) {
        throw new ORPCError('NOT_FOUND', { message: 'Beatmap not found' });
      }

      const beatmapId = beatmapResult.id;

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
                avgRating: sql<number>`AVG(COALESCE(${schema.ratingAdjustments.ratingBefore}, ${schema.ratingAdjustments.ratingAfter}))`,
                playerCount: sql<number>`COUNT(DISTINCT ${schema.gameScores.playerId})`,
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
        match.games.push({
          gameId: row.gameId,
          gameNumber,
          mods: row.gameMods,
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
        { beatmapOsuId: input.beatmapOsuId, tournamentId: input.tournamentId },
        error
      );

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to load tournament matches',
      });
    }
  });

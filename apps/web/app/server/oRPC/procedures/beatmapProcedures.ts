import { ORPCError } from '@orpc/server';
import { and, desc, eq, sql } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { Mods, Ruleset, VerificationStatus } from '@otr/core/osu';
import {
  BeatmapStatsRequestSchema,
  BeatmapStatsResponseSchema,
  type BeatmapStatsResponse,
  type BeatmapTournamentUsage,
  type BeatmapUsagePoint,
  type BeatmapModDistribution,
  type BeatmapPlayerDistribution,
  type BeatmapModTrend,
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
      .where(eq(schema.beatmaps.id, input.id))
      .limit(1);

    if (!beatmapRow[0]) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Beatmap not found',
      });
    }

    const beatmap = beatmapRow[0];

    const creatorsRows = await context.db
      .select(playerCompactColumns)
      .from(schema.joinBeatmapCreators)
      .innerJoin(
        schema.players,
        eq(schema.joinBeatmapCreators.creatorsId, schema.players.id)
      )
      .where(eq(schema.joinBeatmapCreators.createdBeatmapsId, input.id));

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
          eq(schema.gameScores.verificationStatus, VerificationStatus.Verified)
        )
      )
      .where(
        and(
          eq(schema.games.beatmapId, input.id),
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
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
        month: sql<string>`TO_CHAR(${schema.games.startTime}, 'YYYY-MM')`,
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
          eq(schema.games.beatmapId, input.id),
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
          eq(schema.matches.verificationStatus, VerificationStatus.Verified),
          eq(schema.games.verificationStatus, VerificationStatus.Verified)
        )
      )
      .groupBy(sql`TO_CHAR(${schema.games.startTime}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${schema.games.startTime}, 'YYYY-MM')`);

    const poolingRows = await context.db
      .select({
        month: sql<string>`TO_CHAR(${schema.tournaments.startTime}, 'YYYY-MM')`,
        pooledCount: sql<number>`COUNT(DISTINCT ${schema.tournaments.id})`,
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
          eq(schema.joinPooledBeatmaps.pooledBeatmapsId, input.id),
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
          sql`${schema.tournaments.startTime} IS NOT NULL`
        )
      )
      .groupBy(sql`TO_CHAR(${schema.tournaments.startTime}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${schema.tournaments.startTime}, 'YYYY-MM')`);

    const usageByMonth = new Map<string, number>();
    for (const row of usageRows) {
      usageByMonth.set(row.month, Number(row.gameCount));
    }

    const poolingByMonth = new Map<string, number>();
    for (const row of poolingRows) {
      poolingByMonth.set(row.month, Number(row.pooledCount));
    }

    const allMonths = new Set([
      ...usageRows.map((r) => r.month),
      ...poolingRows.map((r) => r.month),
    ]);

    const usageOverTime: BeatmapUsagePoint[] = [];
    if (allMonths.size > 0) {
      const sortedMonths = Array.from(allMonths).sort();
      const startDate = new Date(sortedMonths[0] + '-01');
      const endDate = new Date(sortedMonths[sortedMonths.length - 1] + '-01');

      const current = new Date(startDate);
      while (current <= endDate) {
        const monthKey = current.toISOString().slice(0, 7);
        usageOverTime.push({
          month: monthKey,
          gameCount: usageByMonth.get(monthKey) ?? 0,
          pooledCount: poolingByMonth.get(monthKey) ?? 0,
        });
        current.setMonth(current.getMonth() + 1);
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
          eq(schema.games.beatmapId, input.id),
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
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
        schema.tournaments.isLazer
      )
      .orderBy(desc(sql`COUNT(DISTINCT ${schema.games.id})`));

    const tournaments: BeatmapTournamentUsage[] = tournamentRows.map((row) => {
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

      return {
        tournament: {
          id: row.tournamentId,
          name: row.tournamentName,
          abbreviation: row.tournamentAbbreviation,
          ruleset: row.tournamentRuleset as Ruleset,
          lobbySize: row.tournamentLobbySize,
          startTime: row.tournamentStartTime,
          endTime: row.tournamentEndTime,
          verificationStatus: row.tournamentVerificationStatus as VerificationStatus,
          isLazer: row.tournamentIsLazer,
        },
        gameCount: Number(row.gameCount),
        mostCommonMod,
        firstPlayedAt: row.firstPlayedAt,
      };
    });

    const modRows = await context.db
      .select({
        mods: schema.games.mods,
        gameCount: sql<number>`COUNT(*)`,
      })
      .from(schema.games)
      .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
      .innerJoin(
        schema.tournaments,
        eq(schema.tournaments.id, schema.matches.tournamentId)
      )
      .where(
        and(
          eq(schema.games.beatmapId, input.id),
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
          eq(schema.matches.verificationStatus, VerificationStatus.Verified),
          eq(schema.games.verificationStatus, VerificationStatus.Verified)
        )
      )
      .groupBy(schema.games.mods)
      .orderBy(desc(sql`COUNT(*)`));

    const totalModGames = modRows.reduce(
      (acc, row) => acc + Number(row.gameCount),
      0
    );
    const modDistribution: BeatmapModDistribution[] = modRows.map((row) => ({
      mods: row.mods,
      gameCount: Number(row.gameCount),
      percentage:
        totalModGames > 0
          ? (Number(row.gameCount) / totalModGames) * 100
          : 0,
    }));

    const RATING_BUCKET_SIZE = 250;
    const playerDistributionRows = await context.db
      .select({
        bucketMin: sql<number>`FLOOR(${schema.playerRatings.rating} / ${sql.raw(String(RATING_BUCKET_SIZE))}) * ${sql.raw(String(RATING_BUCKET_SIZE))}`,
        playerCount: sql<number>`COUNT(DISTINCT ${schema.gameScores.playerId})`,
      })
      .from(schema.gameScores)
      .innerJoin(schema.games, eq(schema.games.id, schema.gameScores.gameId))
      .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
      .innerJoin(
        schema.tournaments,
        eq(schema.tournaments.id, schema.matches.tournamentId)
      )
      .innerJoin(
        schema.playerRatings,
        and(
          eq(schema.playerRatings.playerId, schema.gameScores.playerId),
          eq(schema.playerRatings.ruleset, schema.tournaments.ruleset)
        )
      )
      .where(
        and(
          eq(schema.games.beatmapId, input.id),
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
          eq(schema.matches.verificationStatus, VerificationStatus.Verified),
          eq(schema.games.verificationStatus, VerificationStatus.Verified),
          eq(schema.gameScores.verificationStatus, VerificationStatus.Verified)
        )
      )
      .groupBy(
        sql`FLOOR(${schema.playerRatings.rating} / ${sql.raw(String(RATING_BUCKET_SIZE))}) * ${sql.raw(String(RATING_BUCKET_SIZE))}`
      )
      .orderBy(
        sql`FLOOR(${schema.playerRatings.rating} / ${sql.raw(String(RATING_BUCKET_SIZE))}) * ${sql.raw(String(RATING_BUCKET_SIZE))}`
      );

    const playerDistribution: BeatmapPlayerDistribution[] =
      playerDistributionRows.map((row) => {
        const bucketMin = Number(row.bucketMin);
        const bucketMax = bucketMin + RATING_BUCKET_SIZE;
        return {
          bucket: `${bucketMin}-${bucketMax}`,
          bucketMin,
          bucketMax,
          playerCount: Number(row.playerCount),
        };
      });

    const modTrendRows = await context.db
      .select({
        month: sql<string>`TO_CHAR(${schema.games.startTime}, 'YYYY-MM')`,
        mods: schema.games.mods,
        gameCount: sql<number>`COUNT(*)`,
      })
      .from(schema.games)
      .innerJoin(schema.matches, eq(schema.matches.id, schema.games.matchId))
      .innerJoin(
        schema.tournaments,
        eq(schema.tournaments.id, schema.matches.tournamentId)
      )
      .where(
        and(
          eq(schema.games.beatmapId, input.id),
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
          eq(schema.matches.verificationStatus, VerificationStatus.Verified),
          eq(schema.games.verificationStatus, VerificationStatus.Verified)
        )
      )
      .groupBy(
        sql`TO_CHAR(${schema.games.startTime}, 'YYYY-MM')`,
        schema.games.mods
      )
      .orderBy(sql`TO_CHAR(${schema.games.startTime}, 'YYYY-MM')`);

    const modTrend: BeatmapModTrend[] = modTrendRows.map((row) => ({
      month: row.month,
      mods: row.mods,
      gameCount: Number(row.gameCount),
    }));

    const topPerformerRows = await context.db
      .select({
        playerId: schema.players.id,
        playerOsuId: schema.players.osuId,
        playerUsername: schema.players.username,
        playerCountry: schema.players.country,
        playerDefaultRuleset: schema.players.defaultRuleset,
        score: schema.gameScores.score,
        accuracy: schema.gameScores.accuracy,
        mods: schema.games.mods,
        playedAt: schema.games.startTime,
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
          eq(schema.games.beatmapId, input.id),
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified),
          eq(schema.matches.verificationStatus, VerificationStatus.Verified),
          eq(schema.games.verificationStatus, VerificationStatus.Verified),
          eq(schema.gameScores.verificationStatus, VerificationStatus.Verified)
        )
      )
      .orderBy(desc(schema.gameScores.score))
      .limit(10);

    const topPerformers: BeatmapTopPerformer[] = topPerformerRows.map((row) => ({
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
    }));

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
      playerDistribution,
      modTrend,
      topPerformers,
    };

    return BeatmapStatsResponseSchema.parse(response);
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }

      console.error('[orpc] beatmaps.stats failed', { beatmapId: input.id }, error);

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to load beatmap statistics',
      });
    }
  });

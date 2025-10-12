import { ORPCError } from '@orpc/server';
import { asc, desc, eq, inArray } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { AdminNoteSchema, AdminNoteUserSchema } from '@/lib/orpc/schema/common';
import {
  MatchDetailSchema,
  MatchIdInputSchema,
  MatchRoster,
  RatingAdjustment,
} from '@/lib/orpc/schema/match';
import { PlayerSchema } from '@/lib/orpc/schema/player';
import {
  RatingAdjustmentType,
  Ruleset,
  ScoringType,
  ScoreGrade,
  Team,
  TeamType,
  VerificationStatus,
} from '@otr/core/osu';

import { publicProcedure } from './base';

const MODS_FREE_MOD_ALLOWED = 522_171_579;

type AdminNote = ReturnType<(typeof AdminNoteSchema)['parse']>;

interface AdminNoteRow {
  id: number;
  referenceId: number;
  note: string;
  created: string;
  updated: string | null;
  userId: number | null;
  userLastLogin: string | null;
  playerId: number | null;
  playerOsuId: number | null;
  playerUsername: string | null;
  playerCountry: string | null;
  playerDefaultRuleset: number | null;
  playerOsuLastFetch: string | null;
  playerOsuTrackLastFetch: string | null;
}

const FALLBACK_PLAYER = {
  id: -1,
  osuId: -1,
  username: 'Unknown',
  country: '',
  defaultRuleset: Ruleset.Osu,
  osuLastFetch: '2007-09-17 00:00:00',
  osuTrackLastFetch: '2007-09-17 00:00:00',
  userId: null as number | null,
};

const FALLBACK_ADMIN_USER = {
  id: -1,
  lastLogin: null as string | null,
  player: FALLBACK_PLAYER,
};

function mapAdminNote(row: AdminNoteRow): AdminNote {
  const base = {
    id: row.id,
    referenceId: row.referenceId,
    note: row.note,
    created: row.created,
    updated: row.updated ?? null,
  } satisfies Pick<
    AdminNote,
    'id' | 'referenceId' | 'note' | 'created' | 'updated'
  >;

  if (row.userId != null && row.playerId != null) {
    return {
      ...base,
      adminUser: AdminNoteUserSchema.parse({
        id: row.userId,
        lastLogin: row.userLastLogin ?? null,
        player: PlayerSchema.parse({
          id: row.playerId,
          osuId: row.playerOsuId ?? -1,
          username: row.playerUsername ?? 'Unknown',
          country: row.playerCountry ?? '',
          defaultRuleset: (row.playerDefaultRuleset ?? Ruleset.Osu) as Ruleset,
          osuLastFetch: row.playerOsuLastFetch ?? '2007-09-17 00:00:00',
          osuTrackLastFetch:
            row.playerOsuTrackLastFetch ?? '2007-09-17 00:00:00',
          userId: row.userId,
        }),
      }),
    };
  }

  return {
    ...base,
    adminUser: {
      ...FALLBACK_ADMIN_USER,
      player: { ...FALLBACK_PLAYER },
    },
  };
}

function calculateAccuracy({
  ruleset,
  count50,
  count100,
  count300,
  countMiss,
  countKatu,
  countGeki,
}: {
  ruleset: Ruleset;
  count50: number;
  count100: number;
  count300: number;
  countMiss: number;
  countKatu: number;
  countGeki: number;
}): number {
  const clamp = (value: number) =>
    Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;

  switch (ruleset) {
    case Ruleset.Osu: {
      const total = count300 + count100 + count50 + countMiss;
      if (total === 0) return 0;
      const numerator = count300 * 300 + count100 * 100 + count50 * 50;
      return clamp((numerator / (total * 300)) * 100);
    }
    case Ruleset.Taiko: {
      const total = count300 + count100 + countMiss;
      if (total === 0) return 0;
      const numerator = count300 + count100 * 0.5;
      return clamp((numerator / total) * 100);
    }
    case Ruleset.Catch: {
      const caught = count300 + count100 + count50;
      const total = caught + countKatu + countMiss;
      if (total === 0) return 0;
      return clamp((caught / total) * 100);
    }
    case Ruleset.ManiaOther:
    case Ruleset.Mania4k:
    case Ruleset.Mania7k:
    default: {
      const total =
        count300 + countGeki + count100 + countKatu + count50 + countMiss;
      if (total === 0) return 0;
      const numerator =
        (count300 + countGeki) * 300 +
        countKatu * 200 +
        count100 * 100 +
        count50 * 50;
      return clamp((numerator / (total * 300)) * 100);
    }
  }
}

function deriveWinRecord(matchId: number, rosters: MatchRoster[]) {
  if (rosters.length < 2) {
    return null;
  }

  const sorted = [...rosters].sort((a, b) => b.score - a.score);
  const topScore = sorted[0]?.score ?? 0;
  const tied = sorted.filter((roster) => roster.score === topScore);

  if (tied.length > 1) {
    return {
      matchId,
      isTied: true,
      loserRoster: null,
      winnerRoster: null,
      loserPoints: topScore,
      winnerPoints: topScore,
      loserTeam: null,
      winnerTeam: null,
    } as const;
  }

  const winner = sorted[0];
  const loser = sorted[1];

  return {
    matchId,
    isTied: false,
    loserRoster: loser?.roster ?? null,
    winnerRoster: winner?.roster ?? null,
    loserPoints: loser?.score ?? 0,
    winnerPoints: winner?.score ?? 0,
    loserTeam: loser?.team ?? null,
    winnerTeam: winner?.team ?? null,
  } as const;
}

export const getMatch = publicProcedure
  .input(MatchIdInputSchema)
  .output(MatchDetailSchema)
  .route({
    summary: 'Get match details',
    tags: ['Matches', 'public'],
    method: 'GET',
    path: '/matches/{id}',
  })
  .handler(async ({ input, context }) => {
    const [matchRow] = await context.db
      .select({
        id: schema.matches.id,
        osuId: schema.matches.osuId,
        tournamentId: schema.matches.tournamentId,
        name: schema.matches.name,
        startTime: schema.matches.startTime,
        endTime: schema.matches.endTime,
        verificationStatus: schema.matches.verificationStatus,
        rejectionReason: schema.matches.rejectionReason,
        warningFlags: schema.matches.warningFlags,
        submittedByUserId: schema.matches.submittedByUserId,
        verifiedByUserId: schema.matches.verifiedByUserId,
        dataFetchStatus: schema.matches.dataFetchStatus,
        tournamentName: schema.tournaments.name,
        tournamentAbbreviation: schema.tournaments.abbreviation,
      })
      .from(schema.matches)
      .leftJoin(
        schema.tournaments,
        eq(schema.tournaments.id, schema.matches.tournamentId)
      )
      .where(eq(schema.matches.id, input.id))
      .limit(1);

    if (!matchRow) {
      throw new ORPCError('NOT_FOUND', {
        message: `Match ${input.id} not found`,
      });
    }

    const matchId = matchRow.id;

    const gameRows = await context.db
      .select({
        id: schema.games.id,
        osuId: schema.games.osuId,
        matchId: schema.games.matchId,
        beatmapId: schema.games.beatmapId,
        ruleset: schema.games.ruleset,
        scoringType: schema.games.scoringType,
        teamType: schema.games.teamType,
        mods: schema.games.mods,
        startTime: schema.games.startTime,
        endTime: schema.games.endTime,
        verificationStatus: schema.games.verificationStatus,
        rejectionReason: schema.games.rejectionReason,
        warningFlags: schema.games.warningFlags,
        beatmapDbId: schema.beatmaps.id,
        beatmapOsuId: schema.beatmaps.osuId,
        beatmapRuleset: schema.beatmaps.ruleset,
        beatmapRankedStatus: schema.beatmaps.rankedStatus,
        beatmapDiffName: schema.beatmaps.diffName,
        beatmapTotalLength: schema.beatmaps.totalLength,
        beatmapDrainLength: schema.beatmaps.drainLength,
        beatmapBpm: schema.beatmaps.bpm,
        beatmapCountCircle: schema.beatmaps.countCircle,
        beatmapCountSlider: schema.beatmaps.countSlider,
        beatmapCountSpinner: schema.beatmaps.countSpinner,
        beatmapCs: schema.beatmaps.cs,
        beatmapHp: schema.beatmaps.hp,
        beatmapOd: schema.beatmaps.od,
        beatmapAr: schema.beatmaps.ar,
        beatmapSr: schema.beatmaps.sr,
        beatmapMaxCombo: schema.beatmaps.maxCombo,
        beatmapBeatmapsetId: schema.beatmaps.beatmapsetId,
        beatmapDataFetchStatus: schema.beatmaps.dataFetchStatus,
        beatmapsetId: schema.beatmapsets.id,
        beatmapsetOsuId: schema.beatmapsets.osuId,
        beatmapsetTitle: schema.beatmapsets.title,
        beatmapsetArtist: schema.beatmapsets.artist,
        beatmapsetRankedStatus: schema.beatmapsets.rankedStatus,
        beatmapsetRankedDate: schema.beatmapsets.rankedDate,
        beatmapsetSubmittedDate: schema.beatmapsets.submittedDate,
        beatmapsetCreatorId: schema.beatmapsets.creatorId,
        beatmapsetCreatorPlayerId: schema.players.id,
        beatmapsetCreatorOsuId: schema.players.osuId,
        beatmapsetCreatorUsername: schema.players.username,
        beatmapsetCreatorCountry: schema.players.country,
        beatmapsetCreatorDefaultRuleset: schema.players.defaultRuleset,
        beatmapsetCreatorOsuLastFetch: schema.players.osuLastFetch,
        beatmapsetCreatorOsuTrackLastFetch: schema.players.osuTrackLastFetch,
      })
      .from(schema.games)
      .leftJoin(schema.beatmaps, eq(schema.beatmaps.id, schema.games.beatmapId))
      .leftJoin(
        schema.beatmapsets,
        eq(schema.beatmapsets.id, schema.beatmaps.beatmapsetId)
      )
      .leftJoin(
        schema.players,
        eq(schema.players.id, schema.beatmapsets.creatorId)
      )
      .where(eq(schema.games.matchId, matchId))
      .orderBy(asc(schema.games.startTime), asc(schema.games.id));

    const beatmapIds = Array.from(
      new Set(
        gameRows
          .map((row) => row.beatmapDbId)
          .filter((value): value is number => value != null)
      )
    );

    const beatmapCreatorsRows = beatmapIds.length
      ? await context.db
          .select({
            beatmapId: schema.joinBeatmapCreators.createdBeatmapsId,
            playerId: schema.players.id,
            osuId: schema.players.osuId,
            username: schema.players.username,
            country: schema.players.country,
            defaultRuleset: schema.players.defaultRuleset,
            osuLastFetch: schema.players.osuLastFetch,
            osuTrackLastFetch: schema.players.osuTrackLastFetch,
            userId: schema.users.id,
          })
          .from(schema.joinBeatmapCreators)
          .innerJoin(
            schema.players,
            eq(schema.players.id, schema.joinBeatmapCreators.creatorsId)
          )
          .leftJoin(schema.users, eq(schema.users.playerId, schema.players.id))
          .where(
            inArray(schema.joinBeatmapCreators.createdBeatmapsId, beatmapIds)
          )
      : [];

    const beatmapCreatorsById = new Map<
      number,
      ReturnType<(typeof PlayerSchema)['parse']>[]
    >();

    for (const creator of beatmapCreatorsRows) {
      const players = beatmapCreatorsById.get(creator.beatmapId) ?? [];
      players.push(
        PlayerSchema.parse({
          id: creator.playerId,
          osuId: creator.osuId,
          username: creator.username,
          country: creator.country,
          defaultRuleset: creator.defaultRuleset,
          osuLastFetch: creator.osuLastFetch,
          osuTrackLastFetch: creator.osuTrackLastFetch,
          userId: creator.userId ?? null,
        })
      );
      beatmapCreatorsById.set(creator.beatmapId, players);
    }

    const gameIds = gameRows.map((row) => row.id);

    const gameAdminNotesPromise = gameIds.length
      ? context.db
          .select({
            id: schema.gameAdminNotes.id,
            referenceId: schema.gameAdminNotes.referenceId,
            note: schema.gameAdminNotes.note,
            created: schema.gameAdminNotes.created,
            updated: schema.gameAdminNotes.updated,
            userId: schema.users.id,
            userLastLogin: schema.users.lastLogin,
            playerId: schema.players.id,
            playerOsuId: schema.players.osuId,
            playerUsername: schema.players.username,
            playerCountry: schema.players.country,
            playerDefaultRuleset: schema.players.defaultRuleset,
            playerOsuLastFetch: schema.players.osuLastFetch,
            playerOsuTrackLastFetch: schema.players.osuTrackLastFetch,
          })
          .from(schema.gameAdminNotes)
          .leftJoin(
            schema.users,
            eq(schema.users.id, schema.gameAdminNotes.adminUserId)
          )
          .leftJoin(
            schema.players,
            eq(schema.players.id, schema.users.playerId)
          )
          .where(inArray(schema.gameAdminNotes.referenceId, gameIds))
      : Promise.resolve([]);

    const scoreRowsPromise = gameIds.length
      ? context.db
          .select({
            id: schema.gameScores.id,
            playerId: schema.gameScores.playerId,
            gameId: schema.gameScores.gameId,
            score: schema.gameScores.score,
            placement: schema.gameScores.placement,
            maxCombo: schema.gameScores.maxCombo,
            count50: schema.gameScores.count50,
            count100: schema.gameScores.count100,
            count300: schema.gameScores.count300,
            countMiss: schema.gameScores.countMiss,
            countKatu: schema.gameScores.countKatu,
            countGeki: schema.gameScores.countGeki,
            pass: schema.gameScores.pass,
            perfect: schema.gameScores.perfect,
            grade: schema.gameScores.grade,
            mods: schema.gameScores.mods,
            team: schema.gameScores.team,
            ruleset: schema.gameScores.ruleset,
            verificationStatus: schema.gameScores.verificationStatus,
            rejectionReason: schema.gameScores.rejectionReason,
            created: schema.gameScores.created,
            updated: schema.gameScores.updated,
          })
          .from(schema.gameScores)
          .where(inArray(schema.gameScores.gameId, gameIds))
          .orderBy(
            asc(schema.gameScores.placement),
            desc(schema.gameScores.score)
          )
      : Promise.resolve([]);

    const playerMatchStatsPromise = context.db
      .select({
        id: schema.playerMatchStats.id,
        playerId: schema.playerMatchStats.playerId,
        matchId: schema.playerMatchStats.matchId,
        won: schema.playerMatchStats.won,
        gamesWon: schema.playerMatchStats.gamesWon,
        gamesLost: schema.playerMatchStats.gamesLost,
        gamesPlayed: schema.playerMatchStats.gamesPlayed,
        averageScore: schema.playerMatchStats.averageScore,
        averageAccuracy: schema.playerMatchStats.averageAccuracy,
        averageMisses: schema.playerMatchStats.averageMisses,
        averagePlacement: schema.playerMatchStats.averagePlacement,
        matchCost: schema.playerMatchStats.matchCost,
        teammateIds: schema.playerMatchStats.teammateIds,
        opponentIds: schema.playerMatchStats.opponentIds,
      })
      .from(schema.playerMatchStats)
      .where(eq(schema.playerMatchStats.matchId, matchId));

    const ratingAdjustmentsPromise = context.db
      .select({
        id: schema.ratingAdjustments.id,
        adjustmentType: schema.ratingAdjustments.adjustmentType,
        ruleset: schema.ratingAdjustments.ruleset,
        timestamp: schema.ratingAdjustments.timestamp,
        ratingBefore: schema.ratingAdjustments.ratingBefore,
        ratingAfter: schema.ratingAdjustments.ratingAfter,
        volatilityBefore: schema.ratingAdjustments.volatilityBefore,
        volatilityAfter: schema.ratingAdjustments.volatilityAfter,
        playerRatingId: schema.ratingAdjustments.playerRatingId,
        playerId: schema.ratingAdjustments.playerId,
        matchId: schema.ratingAdjustments.matchId,
      })
      .from(schema.ratingAdjustments)
      .where(eq(schema.ratingAdjustments.matchId, matchId))
      .orderBy(desc(schema.ratingAdjustments.timestamp));

    const matchAdminNotesPromise = context.db
      .select({
        id: schema.matchAdminNotes.id,
        referenceId: schema.matchAdminNotes.referenceId,
        note: schema.matchAdminNotes.note,
        created: schema.matchAdminNotes.created,
        updated: schema.matchAdminNotes.updated,
        userId: schema.users.id,
        userLastLogin: schema.users.lastLogin,
        playerId: schema.players.id,
        playerOsuId: schema.players.osuId,
        playerUsername: schema.players.username,
        playerCountry: schema.players.country,
        playerDefaultRuleset: schema.players.defaultRuleset,
        playerOsuLastFetch: schema.players.osuLastFetch,
        playerOsuTrackLastFetch: schema.players.osuTrackLastFetch,
      })
      .from(schema.matchAdminNotes)
      .leftJoin(
        schema.users,
        eq(schema.users.id, schema.matchAdminNotes.adminUserId)
      )
      .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
      .where(eq(schema.matchAdminNotes.referenceId, matchId));

    const rosterRowsPromise = context.db
      .select({
        id: schema.matchRosters.id,
        roster: schema.matchRosters.roster,
        team: schema.matchRosters.team,
        score: schema.matchRosters.score,
      })
      .from(schema.matchRosters)
      .where(eq(schema.matchRosters.matchId, matchId));

    const [
      gameAdminNotesRows,
      scoreRows,
      playerMatchStatsRows,
      ratingAdjustmentsRows,
      matchAdminNotesRows,
      rosterRows,
    ] = await Promise.all([
      gameAdminNotesPromise,
      scoreRowsPromise,
      playerMatchStatsPromise,
      ratingAdjustmentsPromise,
      matchAdminNotesPromise,
      rosterRowsPromise,
    ]);

    const scoreIds = scoreRows.map((row) => row.id);

    const scoreAdminNotesRows = scoreIds.length
      ? await context.db
          .select({
            id: schema.gameScoreAdminNotes.id,
            referenceId: schema.gameScoreAdminNotes.referenceId,
            note: schema.gameScoreAdminNotes.note,
            created: schema.gameScoreAdminNotes.created,
            updated: schema.gameScoreAdminNotes.updated,
            userId: schema.users.id,
            userLastLogin: schema.users.lastLogin,
            playerId: schema.players.id,
            playerOsuId: schema.players.osuId,
            playerUsername: schema.players.username,
            playerCountry: schema.players.country,
            playerDefaultRuleset: schema.players.defaultRuleset,
            playerOsuLastFetch: schema.players.osuLastFetch,
            playerOsuTrackLastFetch: schema.players.osuTrackLastFetch,
          })
          .from(schema.gameScoreAdminNotes)
          .leftJoin(
            schema.users,
            eq(schema.users.id, schema.gameScoreAdminNotes.adminUserId)
          )
          .leftJoin(
            schema.players,
            eq(schema.players.id, schema.users.playerId)
          )
          .where(inArray(schema.gameScoreAdminNotes.referenceId, scoreIds))
      : [];

    const scoreAdminNotesByScoreId = new Map<number, AdminNote[]>();
    for (const noteRow of scoreAdminNotesRows as AdminNoteRow[]) {
      const notes = scoreAdminNotesByScoreId.get(noteRow.referenceId) ?? [];
      notes.push(mapAdminNote(noteRow));
      scoreAdminNotesByScoreId.set(noteRow.referenceId, notes);
    }

    const gameAdminNotesByGameId = new Map<number, AdminNote[]>();
    for (const noteRow of gameAdminNotesRows as AdminNoteRow[]) {
      const notes = gameAdminNotesByGameId.get(noteRow.referenceId) ?? [];
      notes.push(mapAdminNote(noteRow));
      gameAdminNotesByGameId.set(noteRow.referenceId, notes);
    }

    const matchAdminNotes = (matchAdminNotesRows as AdminNoteRow[]).map((row) =>
      mapAdminNote(row)
    );

    const scoresByGameId = new Map<number, typeof scoreRows>();
    for (const score of scoreRows) {
      const list = scoresByGameId.get(score.gameId) ?? [];
      list.push(score);
      scoresByGameId.set(score.gameId, list);
    }

    const playerIds = new Set<number>();
    for (const score of scoreRows) {
      playerIds.add(score.playerId);
    }
    for (const stat of playerMatchStatsRows) {
      playerIds.add(stat.playerId);
    }

    const playersRows = playerIds.size
      ? await context.db
          .select({
            id: schema.players.id,
            osuId: schema.players.osuId,
            username: schema.players.username,
            country: schema.players.country,
            defaultRuleset: schema.players.defaultRuleset,
            osuLastFetch: schema.players.osuLastFetch,
            osuTrackLastFetch: schema.players.osuTrackLastFetch,
            userId: schema.users.id,
          })
          .from(schema.players)
          .leftJoin(schema.users, eq(schema.users.playerId, schema.players.id))
          .where(inArray(schema.players.id, Array.from(playerIds)))
      : [];

    const playersById = new Map<
      number,
      ReturnType<(typeof PlayerSchema)['parse']>
    >();
    for (const player of playersRows) {
      playersById.set(
        player.id,
        PlayerSchema.parse({
          id: player.id,
          osuId: player.osuId,
          username: player.username,
          country: player.country,
          defaultRuleset: player.defaultRuleset as Ruleset,
          osuLastFetch: player.osuLastFetch,
          osuTrackLastFetch: player.osuTrackLastFetch,
          userId: player.userId ?? null,
        })
      );
    }

    const games = gameRows.map((game) => {
      const beatmap =
        game.beatmapDbId != null
          ? {
              id: game.beatmapDbId,
              osuId: game.beatmapOsuId ?? 0,
              ruleset: (game.beatmapRuleset ?? game.ruleset) as Ruleset,
              rankedStatus: game.beatmapRankedStatus ?? 0,
              diffName: game.beatmapDiffName ?? 'Unknown difficulty',
              totalLength: game.beatmapTotalLength ?? 0,
              drainLength: game.beatmapDrainLength ?? 0,
              bpm: game.beatmapBpm ?? 0,
              countCircle: game.beatmapCountCircle ?? 0,
              countSlider: game.beatmapCountSlider ?? 0,
              countSpinner: game.beatmapCountSpinner ?? 0,
              cs: game.beatmapCs ?? 0,
              hp: game.beatmapHp ?? 0,
              od: game.beatmapOd ?? 0,
              ar: game.beatmapAr ?? 0,
              sr: game.beatmapSr ?? 0,
              maxCombo: game.beatmapMaxCombo ?? null,
              beatmapsetId: game.beatmapBeatmapsetId ?? null,
              dataFetchStatus: game.beatmapDataFetchStatus ?? 0,
              beatmapset:
                game.beatmapsetId != null
                  ? {
                      id: game.beatmapsetId,
                      osuId: game.beatmapsetOsuId ?? 0,
                      title: game.beatmapsetTitle ?? 'Unknown',
                      artist: game.beatmapsetArtist ?? 'Unknown',
                      rankedStatus: game.beatmapsetRankedStatus ?? 0,
                      rankedDate: game.beatmapsetRankedDate ?? null,
                      submittedDate: game.beatmapsetSubmittedDate ?? null,
                      creatorId: game.beatmapsetCreatorId ?? null,
                      creator:
                        game.beatmapsetCreatorPlayerId != null
                          ? PlayerSchema.parse({
                              id: game.beatmapsetCreatorPlayerId,
                              osuId: game.beatmapsetCreatorOsuId ?? 0,
                              username:
                                game.beatmapsetCreatorUsername ?? 'Unknown',
                              country: game.beatmapsetCreatorCountry ?? '',
                              defaultRuleset:
                                (game.beatmapsetCreatorDefaultRuleset ??
                                  Ruleset.Osu) as Ruleset,
                              osuLastFetch:
                                game.beatmapsetCreatorOsuLastFetch ??
                                '2007-09-17 00:00:00',
                              osuTrackLastFetch:
                                game.beatmapsetCreatorOsuTrackLastFetch ??
                                '2007-09-17 00:00:00',
                              userId: null,
                            })
                          : null,
                    }
                  : null,
              creators: beatmapCreatorsById.get(game.beatmapDbId) ?? [],
            }
          : null;

      const scores = (scoresByGameId.get(game.id) ?? []).map((score) => ({
        id: score.id,
        playerId: score.playerId,
        gameId: score.gameId,
        score: score.score,
        placement: score.placement,
        maxCombo: score.maxCombo,
        count50: score.count50,
        count100: score.count100,
        count300: score.count300,
        countMiss: score.countMiss,
        countKatu: score.countKatu,
        countGeki: score.countGeki,
        pass: score.pass,
        perfect: score.perfect,
        grade: score.grade as ScoreGrade,
        mods: score.mods,
        team: score.team as Team,
        ruleset: score.ruleset as Ruleset,
        verificationStatus: score.verificationStatus as VerificationStatus,
        rejectionReason: score.rejectionReason,
        accuracy: Number(
          calculateAccuracy({
            ruleset: score.ruleset as Ruleset,
            count50: score.count50,
            count100: score.count100,
            count300: score.count300,
            countMiss: score.countMiss,
            countKatu: score.countKatu,
            countGeki: score.countGeki,
          }).toFixed(6)
        ),
        adminNotes: scoreAdminNotesByScoreId.get(score.id) ?? [],
        created: score.created,
        updated: score.updated ?? null,
      }));

      return {
        id: game.id,
        osuId: game.osuId,
        matchId: game.matchId,
        beatmapId: game.beatmapId ?? null,
        ruleset: game.ruleset as Ruleset,
        scoringType: game.scoringType as ScoringType,
        teamType: game.teamType as TeamType,
        mods: game.mods,
        startTime: game.startTime ?? null,
        endTime: game.endTime ?? null,
        verificationStatus: game.verificationStatus as VerificationStatus,
        rejectionReason: game.rejectionReason,
        warningFlags: game.warningFlags,
        isFreeMod:
          (game.mods & MODS_FREE_MOD_ALLOWED) === MODS_FREE_MOD_ALLOWED,
        beatmap,
        adminNotes: gameAdminNotesByGameId.get(game.id) ?? [],
        scores,
      };
    });

    const players = Array.from(playersById.values());

    const playerMatchStats = playerMatchStatsRows.map((stat) => ({
      id: stat.id,
      playerId: stat.playerId,
      matchId: stat.matchId,
      won: stat.won,
      gamesWon: stat.gamesWon,
      gamesLost: stat.gamesLost,
      gamesPlayed: stat.gamesPlayed,
      averageScore: stat.averageScore,
      averageAccuracy: stat.averageAccuracy,
      averageMisses: stat.averageMisses,
      averagePlacement: stat.averagePlacement,
      matchCost: stat.matchCost,
      teammateIds: stat.teammateIds ?? [],
      opponentIds: stat.opponentIds ?? [],
    }));

    const ratingAdjustments = ratingAdjustmentsRows.map<RatingAdjustment>(
      (adjustment) => ({
        id: adjustment.id,
        adjustmentType: adjustment.adjustmentType as RatingAdjustmentType,
        ruleset: adjustment.ruleset as Ruleset,
        timestamp: adjustment.timestamp,
        ratingBefore: adjustment.ratingBefore,
        ratingAfter: adjustment.ratingAfter,
        ratingDelta: adjustment.ratingAfter - adjustment.ratingBefore,
        volatilityBefore: adjustment.volatilityBefore,
        volatilityAfter: adjustment.volatilityAfter,
        volatilityDelta:
          adjustment.volatilityAfter - adjustment.volatilityBefore,
        playerRatingId: adjustment.playerRatingId,
        playerId: adjustment.playerId,
        matchId: adjustment.matchId ?? null,
      })
    );

    const rosters = rosterRows.map((roster) => ({
      id: roster.id,
      roster: roster.roster ?? [],
      team: roster.team as Team,
      score: roster.score,
    }));

    const winRecord = deriveWinRecord(matchId, rosters);

    const tournament =
      matchRow.tournamentId != null
        ? {
            id: matchRow.tournamentId,
            name: matchRow.tournamentName ?? 'Unknown tournament',
            abbreviation: matchRow.tournamentAbbreviation ?? null,
          }
        : null;

    const matchDetail = MatchDetailSchema.parse({
      id: matchRow.id,
      osuId: matchRow.osuId,
      tournamentId: matchRow.tournamentId,
      name: matchRow.name,
      startTime: matchRow.startTime ?? null,
      endTime: matchRow.endTime ?? null,
      verificationStatus: matchRow.verificationStatus as VerificationStatus,
      rejectionReason: matchRow.rejectionReason,
      warningFlags: matchRow.warningFlags,
      submittedByUserId: matchRow.submittedByUserId ?? null,
      verifiedByUserId: matchRow.verifiedByUserId ?? null,
      dataFetchStatus: matchRow.dataFetchStatus,
      games,
      players,
      playerMatchStats,
      ratingAdjustments,
      adminNotes: matchAdminNotes,
      tournament,
      winRecord,
      rosters,
    });

    return matchDetail;
  });

import { ORPCError } from '@orpc/server';
import {
  SQL,
  SQLWrapper,
  AnyColumn,
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as schema from '@otr/core/db/schema';
import {
  TournamentDetailSchema,
  TournamentListItemSchema,
  TournamentListRequestSchema,
  TournamentListResponseSchema,
  TournamentIdInputSchema,
} from '@/lib/orpc/schema/tournament';

import { fetchTournamentAdminNotes } from './adminNotesProcedures';

import { publicProcedure } from './base';
import {
  Mods,
  Ruleset,
  ScoringType,
  TeamType,
  TournamentQuerySortType,
  VerificationStatus,
} from '@otr/core/osu';

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;
const LIKE_ESCAPE_PATTERN = /[%_\\]/g;

const escapeLikePattern = (value: string) =>
  value.replace(LIKE_ESCAPE_PATTERN, (match) => `\\${match}`);

const normalizeStatNumber = (value: number) =>
  Number.isFinite(value) ? value : 0;

export const listTournaments = publicProcedure
  .input(TournamentListRequestSchema)
  .output(TournamentListResponseSchema)
  .route({
    summary: 'List tournaments',
    tags: ['public'],
    path: '/tournaments/list',
  })
  .handler(async ({ input, context }) => {
    try {
      const page = Math.max(input.page ?? 1, 1);
      const pageSize = Math.max(
        1,
        Math.min(input.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
      );
      const offset = (page - 1) * pageSize;

      const filters: SQL<unknown>[] = [];
      let searchTerm: string | undefined;
      let searchPattern: string | undefined;

      if (input.verified) {
        filters.push(
          eq(schema.tournaments.verificationStatus, VerificationStatus.Verified)
        );
      }

      if (input.ruleset !== undefined) {
        filters.push(eq(schema.tournaments.ruleset, input.ruleset));
      }

      if (input.verificationStatus !== undefined) {
        filters.push(
          eq(schema.tournaments.verificationStatus, input.verificationStatus)
        );
      }

      if (input.rejectionReason !== undefined) {
        filters.push(
          sql`${schema.tournaments.rejectionReason} & ${input.rejectionReason} > 0`
        );
      }

      if (input.submittedBy !== undefined) {
        filters.push(
          eq(schema.tournaments.submittedByUserId, input.submittedBy)
        );
      }

      if (input.verifiedBy !== undefined) {
        filters.push(eq(schema.tournaments.verifiedByUserId, input.verifiedBy));
      }

      if (input.lobbySize !== undefined) {
        filters.push(eq(schema.tournaments.lobbySize, input.lobbySize));
      }

      if (input.dateMin) {
        filters.push(gte(schema.tournaments.startTime, input.dateMin));
      }

      if (input.dateMax) {
        filters.push(lte(schema.tournaments.endTime, input.dateMax));
      }

      if (input.searchQuery) {
        searchTerm = input.searchQuery.trim();
        if (searchTerm.length > 0) {
          searchPattern = `%${escapeLikePattern(searchTerm)}%`;
          const nameOrAbbreviation = or(
            ilike(schema.tournaments.name, searchPattern),
            ilike(schema.tournaments.abbreviation, searchPattern)
          );

          if (nameOrAbbreviation) {
            filters.push(nameOrAbbreviation);
          }
        }
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const sortValue = input.sort ?? TournamentQuerySortType.EndTime;
      const isDescending = input.descending ?? true;
      const orderBy: SQL<unknown>[] = [];

      const direction = <T extends SQLWrapper | AnyColumn>(
        expr: T
      ): SQL<unknown> => (isDescending ? desc(expr) : asc(expr));

      const searchPrefixPattern =
        searchTerm && searchTerm.length > 0
          ? `${escapeLikePattern(searchTerm)}%`
          : undefined;

      switch (sortValue) {
        case TournamentQuerySortType.Id:
          orderBy.push(direction(schema.tournaments.id));
          break;
        case TournamentQuerySortType.StartTime:
          orderBy.push(direction(schema.tournaments.startTime));
          break;
        case TournamentQuerySortType.EndTime:
          orderBy.push(direction(schema.tournaments.endTime));
          break;
        case TournamentQuerySortType.LobbySize:
          orderBy.push(direction(schema.tournaments.lobbySize));
          break;
        case TournamentQuerySortType.SubmissionDate:
          orderBy.push(direction(schema.tournaments.created));
          break;
        case TournamentQuerySortType.SearchQueryRelevance:
          if (searchTerm && searchPattern && searchPrefixPattern) {
            orderBy.push(
              desc(
                sql<number>`CASE
                  WHEN ${schema.tournaments.name} ILIKE ${searchPrefixPattern} THEN 3
                  WHEN ${schema.tournaments.abbreviation} ILIKE ${searchPrefixPattern} THEN 2
                  WHEN ${schema.tournaments.name} ILIKE ${searchPattern} THEN 1
                  ELSE 0
                END`
              )
            );
          }
          orderBy.push(desc(schema.tournaments.created));
          break;
        default:
          orderBy.push(direction(schema.tournaments.endTime));
          break;
      }

      if (orderBy.length === 0) {
        orderBy.push(desc(schema.tournaments.created));
      }

      const baseQuery = context.db
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
        .from(schema.tournaments);

      const conditionedQuery =
        whereClause !== undefined
          ? baseQuery.where(whereClause as SQL<unknown>)
          : baseQuery;

      const rows = await conditionedQuery
        .orderBy(...orderBy)
        .limit(pageSize)
        .offset(offset);

      return rows.map((row) =>
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
    } catch (error) {
      console.error('[orpc] tournaments.list failed', error);

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message:
          error instanceof Error ? error.message : 'Failed to load tournaments',
      });
    }
  });

export const getTournament = publicProcedure
  .input(TournamentIdInputSchema)
  .output(TournamentDetailSchema)
  .route({
    summary: 'Get tournament details',
    tags: ['public'],
    path: '/tournaments/get',
  })
  .handler(async ({ input, context }) => {
    try {
      const tournament = await context.db.query.tournaments.findFirst({
        where: eq(schema.tournaments.id, input.id),
      });

      if (!tournament) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Tournament not found',
        });
      }

      const beatmapsetCreator = alias(schema.players, 'beatmapsetCreator');

      const pooledBeatmapRows = await context.db
        .select({
          beatmapId: schema.beatmaps.id,
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
          beatmapsetDbId: schema.beatmapsets.id,
          beatmapsetOsuId: schema.beatmapsets.osuId,
          beatmapsetArtist: schema.beatmapsets.artist,
          beatmapsetTitle: schema.beatmapsets.title,
          beatmapsetRankedStatus: schema.beatmapsets.rankedStatus,
          beatmapsetRankedDate: schema.beatmapsets.rankedDate,
          beatmapsetSubmittedDate: schema.beatmapsets.submittedDate,
          beatmapsetCreatorId: schema.beatmapsets.creatorId,
          beatmapsetCreatorPlayerId: beatmapsetCreator.id,
          beatmapsetCreatorOsuId: beatmapsetCreator.osuId,
          beatmapsetCreatorUsername: beatmapsetCreator.username,
          beatmapsetCreatorCountry: beatmapsetCreator.country,
          beatmapsetCreatorDefaultRuleset: beatmapsetCreator.defaultRuleset,
          beatmapsetCreatorOsuLastFetch: beatmapsetCreator.osuLastFetch,
          beatmapsetCreatorOsuTrackLastFetch:
            beatmapsetCreator.osuTrackLastFetch,
        })
        .from(schema.joinPooledBeatmaps)
        .innerJoin(
          schema.beatmaps,
          eq(schema.beatmaps.id, schema.joinPooledBeatmaps.pooledBeatmapsId)
        )
        .leftJoin(
          schema.beatmapsets,
          eq(schema.beatmapsets.id, schema.beatmaps.beatmapsetId)
        )
        .leftJoin(
          beatmapsetCreator,
          eq(beatmapsetCreator.id, schema.beatmapsets.creatorId)
        )
        .where(
          eq(schema.joinPooledBeatmaps.tournamentsPooledInId, tournament.id)
        );

      const beatmapIds = pooledBeatmapRows.map((row) => row.beatmapId);

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
            })
            .from(schema.joinBeatmapCreators)
            .innerJoin(
              schema.players,
              eq(schema.players.id, schema.joinBeatmapCreators.creatorsId)
            )
            .where(
              inArray(schema.joinBeatmapCreators.createdBeatmapsId, beatmapIds)
            )
        : [];

      const creatorsByBeatmapId = new Map<
        number,
        {
          id: number;
          osuId: number;
          username: string;
          country: string;
          defaultRuleset: Ruleset;
          osuLastFetch: string;
          osuTrackLastFetch: string;
        }[]
      >();

      for (const creator of beatmapCreatorsRows) {
        const beatmapId = creator.beatmapId;
        const current = creatorsByBeatmapId.get(beatmapId) ?? [];
        current.push({
          id: creator.playerId,
          osuId: creator.osuId,
          username: creator.username,
          country: creator.country,
          defaultRuleset: creator.defaultRuleset as Ruleset,
          osuLastFetch: creator.osuLastFetch,
          osuTrackLastFetch: creator.osuTrackLastFetch ?? '2007-09-17 00:00:00',
        });
        creatorsByBeatmapId.set(beatmapId, current);
      }

      const matchRows = await context.db
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
        })
        .from(schema.matches)
        .where(eq(schema.matches.tournamentId, tournament.id))
        .orderBy(desc(schema.matches.startTime), desc(schema.matches.id));

      const matchIds = matchRows.map((match) => match.id);

      const gameRows = matchIds.length
        ? await context.db
            .select({
              id: schema.games.id,
              osuId: schema.games.osuId,
              matchId: schema.games.matchId,
              beatmapId: schema.games.beatmapId,
              ruleset: schema.games.ruleset,
              scoringType: schema.games.scoringType,
              teamType: schema.games.teamType,
              startTime: schema.games.startTime,
              endTime: schema.games.endTime,
              verificationStatus: schema.games.verificationStatus,
              rejectionReason: schema.games.rejectionReason,
              warningFlags: schema.games.warningFlags,
              mods: schema.games.mods,
              playMode: schema.games.playMode,
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
            })
            .from(schema.games)
            .leftJoin(
              schema.beatmaps,
              eq(schema.beatmaps.id, schema.games.beatmapId)
            )
            .where(inArray(schema.games.matchId, matchIds))
            .orderBy(asc(schema.games.startTime), asc(schema.games.id))
        : [];

      type GameRow = (typeof gameRows)[number];

      const gamesByMatchId = new Map<number, GameRow[]>();

      for (const game of gameRows) {
        const items = gamesByMatchId.get(game.matchId) ?? [];
        items.push(game);
        gamesByMatchId.set(game.matchId, items);
      }

      const normalizedMatches = matchRows.map((match) => ({
        id: match.id,
        osuId: match.osuId,
        tournamentId: match.tournamentId,
        name: match.name,
        startTime: match.startTime ?? null,
        endTime: match.endTime ?? null,
        verificationStatus: match.verificationStatus as VerificationStatus,
        rejectionReason: match.rejectionReason,
        warningFlags: match.warningFlags,
        submittedByUserId: match.submittedByUserId ?? null,
        verifiedByUserId: match.verifiedByUserId ?? null,
        dataFetchStatus: match.dataFetchStatus,
        games: (gamesByMatchId.get(match.id) ?? []).map((game) => ({
          id: game.id,
          osuId: game.osuId,
          matchId: game.matchId,
          beatmapId: game.beatmapId ?? null,
          ruleset: game.ruleset as Ruleset,
          scoringType: game.scoringType as ScoringType,
          teamType: game.teamType as TeamType,
          startTime: game.startTime ?? null,
          endTime: game.endTime ?? null,
          verificationStatus: game.verificationStatus as VerificationStatus,
          rejectionReason: game.rejectionReason,
          warningFlags: game.warningFlags,
          mods: game.mods,
          playMode: game.playMode,
          // TODO: This is actually an incorrect calculation.
          // We should create a set of rules which determines this,
          // i.e. mods set at the game level = generally no freemod allowed.
          // Need to investigate.
          isFreeMod: (game.mods & Mods.FreeModAllowed) === Mods.FreeModAllowed,
          beatmap:
            game.beatmapDbId != null && game.beatmapOsuId != null
              ? {
                  id: game.beatmapDbId,
                  osuId: game.beatmapOsuId,
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
                }
              : null,
        })),
      }));

      const adminNotes = await fetchTournamentAdminNotes(
        context.db,
        tournament.id
      );

      const playerStatsRows = await context.db
        .select({
          id: schema.playerTournamentStats.id,
          playerId: schema.playerTournamentStats.playerId,
          tournamentId: schema.playerTournamentStats.tournamentId,
          matchesPlayed: schema.playerTournamentStats.matchesPlayed,
          matchesWon: schema.playerTournamentStats.matchesWon,
          matchesLost: schema.playerTournamentStats.matchesLost,
          gamesPlayed: schema.playerTournamentStats.gamesPlayed,
          gamesWon: schema.playerTournamentStats.gamesWon,
          gamesLost: schema.playerTournamentStats.gamesLost,
          averageMatchCost: schema.playerTournamentStats.averageMatchCost,
          averageRatingDelta: schema.playerTournamentStats.averageRatingDelta,
          averageScore: schema.playerTournamentStats.averageScore,
          averagePlacement: schema.playerTournamentStats.averagePlacement,
          averageAccuracy: schema.playerTournamentStats.averageAccuracy,
          teammateIds: schema.playerTournamentStats.teammateIds,
          matchWinRate: schema.playerTournamentStats.matchWinRate,
          statsPlayerId: schema.players.id,
          statsPlayerOsuId: schema.players.osuId,
          statsPlayerUsername: schema.players.username,
          statsPlayerCountry: schema.players.country,
          statsPlayerDefaultRuleset: schema.players.defaultRuleset,
          statsPlayerOsuLastFetch: schema.players.osuLastFetch,
          statsPlayerOsuTrackLastFetch: schema.players.osuTrackLastFetch,
        })
        .from(schema.playerTournamentStats)
        .leftJoin(
          schema.players,
          eq(schema.players.id, schema.playerTournamentStats.playerId)
        )
        .where(eq(schema.playerTournamentStats.tournamentId, tournament.id))
        .orderBy(desc(schema.playerTournamentStats.averageMatchCost));

      const playerStats = playerStatsRows.map((stat) => ({
        id: stat.id,
        playerId: stat.playerId,
        tournamentId: stat.tournamentId,
        matchesPlayed: stat.matchesPlayed,
        matchesWon: stat.matchesWon,
        matchesLost: stat.matchesLost,
        gamesPlayed: stat.gamesPlayed,
        gamesWon: stat.gamesWon,
        gamesLost: stat.gamesLost,
        averageMatchCost: normalizeStatNumber(stat.averageMatchCost),
        averageRatingDelta: normalizeStatNumber(stat.averageRatingDelta),
        averageScore: Math.trunc(normalizeStatNumber(stat.averageScore)),
        averagePlacement: normalizeStatNumber(stat.averagePlacement),
        averageAccuracy: normalizeStatNumber(stat.averageAccuracy),
        teammateIds: stat.teammateIds ?? [],
        matchWinRate: stat.matchWinRate,
        player:
          stat.statsPlayerId != null
            ? {
                id: stat.statsPlayerId,
                osuId: stat.statsPlayerOsuId ?? -1,
                username: stat.statsPlayerUsername,
                country: stat.statsPlayerCountry,
                defaultRuleset: (stat.statsPlayerDefaultRuleset ??
                  Ruleset.Osu) as Ruleset,
                osuLastFetch: stat.statsPlayerOsuLastFetch,
                osuTrackLastFetch:
                  stat.statsPlayerOsuTrackLastFetch ?? '2007-09-17 00:00:00',
              }
            : {
                id: -1,
                osuId: -1,
                username: 'Unknown',
                country: '',
                defaultRuleset: Ruleset.Osu,
                osuLastFetch: '2007-09-17 00:00:00',
                osuTrackLastFetch: '2007-09-17 00:00:00',
              },
      }));

      const pooledBeatmaps = pooledBeatmapRows.map((beatmap) => {
        const beatmapsetCreator =
          beatmap.beatmapsetCreatorPlayerId == null
            ? null
            : {
                id: beatmap.beatmapsetCreatorPlayerId,
                osuId: beatmap.beatmapsetCreatorOsuId ?? -1,
                username: beatmap.beatmapsetCreatorUsername ?? 'Unknown',
                country: beatmap.beatmapsetCreatorCountry,
                defaultRuleset: (beatmap.beatmapsetCreatorDefaultRuleset ??
                  Ruleset.Osu) as Ruleset,
                osuLastFetch:
                  beatmap.beatmapsetCreatorOsuLastFetch ??
                  '2007-09-17 00:00:00',
                osuTrackLastFetch:
                  beatmap.beatmapsetCreatorOsuTrackLastFetch ??
                  '2007-09-17 00:00:00',
              };

        const beatmapset =
          beatmap.beatmapsetDbId == null
            ? null
            : {
                id: beatmap.beatmapsetDbId,
                osuId: beatmap.beatmapsetOsuId ?? 0,
                artist: beatmap.beatmapsetArtist ?? 'Unknown Artist',
                title: beatmap.beatmapsetTitle ?? 'Unknown Title',
                rankedStatus: beatmap.beatmapsetRankedStatus ?? 0,
                rankedDate: beatmap.beatmapsetRankedDate ?? null,
                submittedDate: beatmap.beatmapsetSubmittedDate ?? null,
                creatorId: beatmap.beatmapsetCreatorId ?? null,
                creator: beatmapsetCreator,
              };

        const creators = (creatorsByBeatmapId.get(beatmap.beatmapId) ?? []).map(
          (creator) => ({
            id: creator.id,
            osuId: creator.osuId,
            username: creator.username,
            country: creator.country,
            defaultRuleset: (creator.defaultRuleset ?? Ruleset.Osu) as Ruleset,
            osuLastFetch: creator.osuLastFetch,
            osuTrackLastFetch:
              creator.osuTrackLastFetch ?? '2007-09-17 00:00:00',
          })
        );

        return {
          id: beatmap.beatmapId,
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
          maxCombo: beatmap.maxCombo ?? null,
          beatmapsetId: beatmap.beatmapsetId ?? null,
          dataFetchStatus: beatmap.dataFetchStatus ?? 0,
          beatmapset,
          attributes: [],
          creators,
        };
      });

      return TournamentDetailSchema.parse({
        id: tournament.id,
        name: tournament.name,
        abbreviation: tournament.abbreviation,
        forumUrl: tournament.forumUrl,
        rankRangeLowerBound: tournament.rankRangeLowerBound,
        ruleset: tournament.ruleset as Ruleset,
        lobbySize: tournament.lobbySize,
        startTime: tournament.startTime ?? null,
        endTime: tournament.endTime ?? null,
        verificationStatus: tournament.verificationStatus as VerificationStatus,
        rejectionReason: tournament.rejectionReason,
        submittedByUserId: tournament.submittedByUserId ?? null,
        verifiedByUserId: tournament.verifiedByUserId ?? null,
        matches: normalizedMatches,
        adminNotes,
        playerTournamentStats: playerStats,
        pooledBeatmaps,
      });
    } catch (error) {
      if (error instanceof ORPCError) {
        throw error;
      }

      console.error('[orpc] tournaments.get failed', error);

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message:
          error instanceof Error
            ? error.message
            : 'Failed to load tournament details',
      });
    }
  });

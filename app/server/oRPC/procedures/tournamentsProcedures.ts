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
import { z } from 'zod';

import * as schema from '@/lib/db/schema';
import {
  TournamentDetailSchema,
  TournamentListItemSchema,
  TournamentListRequestSchema,
  TournamentListResponseSchema,
} from '@/lib/orpc/schema/tournament';

import { publicProcedure } from './base';

const DEFAULT_PAGE_SIZE = 30;
const MAX_PAGE_SIZE = 100;
const VERIFIED_STATUS = 4;
const TOURNAMENT_SORT = {
  ID: 0,
  START_TIME: 1,
  END_TIME: 2,
  SEARCH_RELEVANCE: 3,
  SUBMISSION_DATE: 4,
  LOBBY_SIZE: 5,
} as const;

const LIKE_ESCAPE_PATTERN = /[%_\\]/g;

const escapeLikePattern = (value: string) =>
  value.replace(LIKE_ESCAPE_PATTERN, (match) => `\\${match}`);

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
          eq(schema.tournaments.verificationStatus, VERIFIED_STATUS)
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

      const sortValue = input.sort ?? TOURNAMENT_SORT.END_TIME;
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
        case TOURNAMENT_SORT.ID:
          orderBy.push(direction(schema.tournaments.id));
          break;
        case TOURNAMENT_SORT.START_TIME:
          orderBy.push(direction(schema.tournaments.startTime));
          break;
        case TOURNAMENT_SORT.END_TIME:
          orderBy.push(direction(schema.tournaments.endTime));
          break;
        case TOURNAMENT_SORT.LOBBY_SIZE:
          orderBy.push(direction(schema.tournaments.lobbySize));
          break;
        case TOURNAMENT_SORT.SUBMISSION_DATE:
          orderBy.push(direction(schema.tournaments.created));
          break;
        case TOURNAMENT_SORT.SEARCH_RELEVANCE:
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
          id: Number(row.id),
          created: row.created,
          name: row.name,
          abbreviation: row.abbreviation,
          forumUrl: row.forumUrl,
          rankRangeLowerBound: row.rankRangeLowerBound,
          // TODO: Remove these number casts, they are already numbers.
          ruleset: Number(row.ruleset),
          lobbySize: Number(row.lobbySize),
          startTime: row.startTime ?? null,
          endTime: row.endTime ?? null,
          verificationStatus: Number(row.verificationStatus),
          rejectionReason: Number(row.rejectionReason),
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

const TournamentIdSchema = z.object({
  id: z.number().int().positive(),
});

export const getTournament = publicProcedure
  .input(TournamentIdSchema)
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
          country: string | null;
        }[]
      >();

      for (const creator of beatmapCreatorsRows) {
        const beatmapId = Number(creator.beatmapId);
        const current = creatorsByBeatmapId.get(beatmapId) ?? [];
        current.push({
          id: Number(creator.playerId),
          osuId: Number(creator.osuId),
          username: creator.username,
          country: creator.country ?? null,
        });
        creatorsByBeatmapId.set(beatmapId, current);
      }

      const matchRows = await context.db
        .select({
          id: schema.matches.id,
          name: schema.matches.name,
          startTime: schema.matches.startTime,
          endTime: schema.matches.endTime,
          verificationStatus: schema.matches.verificationStatus,
          rejectionReason: schema.matches.rejectionReason,
          warningFlags: schema.matches.warningFlags,
        })
        .from(schema.matches)
        .where(eq(schema.matches.tournamentId, tournament.id))
        .orderBy(desc(schema.matches.startTime), desc(schema.matches.id));

      const matchIds = matchRows.map((match) => match.id);

      const gameRows = matchIds.length
        ? await context.db
            .select({
              id: schema.games.id,
              matchId: schema.games.matchId,
              startTime: schema.games.startTime,
              verificationStatus: schema.games.verificationStatus,
              rejectionReason: schema.games.rejectionReason,
              warningFlags: schema.games.warningFlags,
              mods: schema.games.mods,
              beatmapOsuId: schema.beatmaps.osuId,
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
        id: Number(match.id),
        name: match.name,
        startTime: match.startTime ?? null,
        endTime: match.endTime ?? null,
        verificationStatus: Number(match.verificationStatus),
        rejectionReason: Number(match.rejectionReason),
        warningFlags: Number(match.warningFlags),
        games: (gamesByMatchId.get(match.id) ?? []).map((game) => ({
          id: Number(game.id),
          startTime: game.startTime ?? null,
          verificationStatus: Number(game.verificationStatus),
          rejectionReason: Number(game.rejectionReason),
          warningFlags: Number(game.warningFlags),
          mods: Number(game.mods),
          beatmap: game.beatmapOsuId
            ? {
                osuId: Number(game.beatmapOsuId),
              }
            : null,
        })),
      }));

      const adminNotesRows = await context.db
        .select({
          id: schema.tournamentAdminNotes.id,
          referenceId: schema.tournamentAdminNotes.referenceId,
          note: schema.tournamentAdminNotes.note,
          created: schema.tournamentAdminNotes.created,
          updated: schema.tournamentAdminNotes.updated,
          userId: schema.users.id,
          userLastLogin: schema.users.lastLogin,
          userPlayerId: schema.users.playerId,
          playerId: schema.players.id,
          playerOsuId: schema.players.osuId,
          playerUsername: schema.players.username,
          playerCountry: schema.players.country,
          playerDefaultRuleset: schema.players.defaultRuleset,
        })
        .from(schema.tournamentAdminNotes)
        .leftJoin(
          schema.users,
          eq(schema.users.id, schema.tournamentAdminNotes.adminUserId)
        )
        .leftJoin(schema.players, eq(schema.players.id, schema.users.playerId))
        .where(eq(schema.tournamentAdminNotes.referenceId, tournament.id))
        .orderBy(desc(schema.tournamentAdminNotes.created));

      const adminNotes = adminNotesRows.map((note) => {
        if (note.userId && note.playerId) {
          return {
            id: Number(note.id),
            referenceId: Number(note.referenceId),
            note: note.note,
            created: note.created,
            updated: note.updated ?? null,
            adminUser: {
              id: Number(note.userId),
              lastLogin: note.userLastLogin ?? null,
              player: {
                id: Number(note.playerId),
                osuId: Number(note.playerOsuId),
                username: note.playerUsername,
                country: note.playerCountry ?? null,
                defaultRuleset: Number(note.playerDefaultRuleset),
                userId: Number(note.userId),
              },
            },
          };
        }

        return {
          id: Number(note.id),
          referenceId: Number(note.referenceId),
          note: note.note,
          created: note.created,
          updated: note.updated ?? null,
          adminUser: {
            id: -1,
            lastLogin: null,
            player: {
              id: -1,
              osuId: -1,
              username: 'Unknown',
              country: null,
              defaultRuleset: 0,
              userId: null,
            },
          },
        };
      });

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
        })
        .from(schema.playerTournamentStats)
        .leftJoin(
          schema.players,
          eq(schema.players.id, schema.playerTournamentStats.playerId)
        )
        .where(eq(schema.playerTournamentStats.tournamentId, tournament.id))
        .orderBy(desc(schema.playerTournamentStats.averageMatchCost));

      const playerStats = playerStatsRows.map((stat) => ({
        id: Number(stat.id),
        playerId: Number(stat.playerId),
        tournamentId: Number(stat.tournamentId),
        matchesPlayed: Number(stat.matchesPlayed),
        matchesWon: Number(stat.matchesWon),
        matchesLost: Number(stat.matchesLost),
        gamesPlayed: Number(stat.gamesPlayed),
        gamesWon: Number(stat.gamesWon),
        gamesLost: Number(stat.gamesLost),
        averageMatchCost: Number(stat.averageMatchCost),
        averageRatingDelta: Number(stat.averageRatingDelta),
        averageScore: Number(stat.averageScore),
        averagePlacement: Number(stat.averagePlacement),
        averageAccuracy: Number(stat.averageAccuracy),
        teammateIds: (stat.teammateIds ?? []).map((id) => Number(id)),
        matchWinRate: Number(stat.matchWinRate),
        player:
          stat.statsPlayerId !== null && stat.statsPlayerId !== undefined
            ? {
                id: Number(stat.statsPlayerId),
                osuId: Number(stat.statsPlayerOsuId),
                username: stat.statsPlayerUsername,
                country: stat.statsPlayerCountry ?? null,
              }
            : {
                id: -1,
                osuId: -1,
                username: 'Unknown',
                country: null,
              },
      }));

      const pooledBeatmaps = pooledBeatmapRows.map((beatmap) => {
        const beatmapsetCreatorPlayerId = beatmap.beatmapsetCreatorPlayerId;
        const beatmapsetCreator =
          beatmapsetCreatorPlayerId === null ||
          beatmapsetCreatorPlayerId === undefined
            ? null
            : {
                id: Number(beatmapsetCreatorPlayerId),
                osuId:
                  beatmap.beatmapsetCreatorOsuId === null ||
                  beatmap.beatmapsetCreatorOsuId === undefined
                    ? -1
                    : Number(beatmap.beatmapsetCreatorOsuId),
                username: beatmap.beatmapsetCreatorUsername ?? 'Unknown',
                country: beatmap.beatmapsetCreatorCountry ?? null,
              };

        const beatmapsetId = beatmap.beatmapsetDbId;
        const beatmapset =
          beatmapsetId === null || beatmapsetId === undefined
            ? null
            : {
                id: Number(beatmapsetId),
                osuId:
                  beatmap.beatmapsetOsuId === null ||
                  beatmap.beatmapsetOsuId === undefined
                    ? 0
                    : Number(beatmap.beatmapsetOsuId),
                artist: beatmap.beatmapsetArtist ?? 'Unknown Artist',
                title: beatmap.beatmapsetTitle ?? 'Unknown Title',
                rankedStatus:
                  beatmap.beatmapsetRankedStatus === null ||
                  beatmap.beatmapsetRankedStatus === undefined
                    ? 0
                    : Number(beatmap.beatmapsetRankedStatus),
                rankedDate: beatmap.beatmapsetRankedDate ?? null,
                submittedDate: beatmap.beatmapsetSubmittedDate ?? null,
                creatorId:
                  beatmap.beatmapsetCreatorId === null ||
                  beatmap.beatmapsetCreatorId === undefined
                    ? null
                    : Number(beatmap.beatmapsetCreatorId),
                creator: beatmapsetCreator,
              };

        const creators =
          creatorsByBeatmapId.get(Number(beatmap.beatmapId)) ?? [];

        return {
          id: Number(beatmap.beatmapId),
          osuId: Number(beatmap.osuId),
          ruleset: Number(beatmap.ruleset),
          rankedStatus: Number(beatmap.rankedStatus),
          diffName: beatmap.diffName,
          totalLength: Number(beatmap.totalLength),
          drainLength: Number(beatmap.drainLength),
          bpm: Number(beatmap.bpm),
          countCircle: Number(beatmap.countCircle),
          countSlider: Number(beatmap.countSlider),
          countSpinner: Number(beatmap.countSpinner),
          cs: Number(beatmap.cs),
          hp: Number(beatmap.hp),
          od: Number(beatmap.od),
          ar: Number(beatmap.ar),
          sr: Number(beatmap.sr),
          maxCombo:
            beatmap.maxCombo === null || beatmap.maxCombo === undefined
              ? null
              : Number(beatmap.maxCombo),
          beatmapsetId:
            beatmap.beatmapsetId === null || beatmap.beatmapsetId === undefined
              ? null
              : Number(beatmap.beatmapsetId),
          beatmapset,
          attributes: [],
          creators,
        };
      });

      return TournamentDetailSchema.parse({
        id: Number(tournament.id),
        name: tournament.name,
        abbreviation: tournament.abbreviation,
        forumUrl: tournament.forumUrl,
        rankRangeLowerBound: Number(tournament.rankRangeLowerBound),
        ruleset: Number(tournament.ruleset),
        lobbySize: Number(tournament.lobbySize),
        startTime: tournament.startTime ?? null,
        endTime: tournament.endTime ?? null,
        verificationStatus: Number(tournament.verificationStatus),
        rejectionReason: Number(tournament.rejectionReason),
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

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
  lte,
  or,
  sql,
} from 'drizzle-orm';
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
        with: {
          matches: {
            columns: {
              id: schema.matches.id,
              name: schema.matches.name,
              startTime: schema.matches.startTime,
              endTime: schema.matches.endTime,
              verificationStatus: schema.matches.verificationStatus,
              rejectionReason: schema.matches.rejectionReason,
              warningFlags: schema.matches.warningFlags,
            },
            orderBy: [desc(schema.matches.startTime), desc(schema.matches.id)],
            with: {
              games: {
                columns: {
                  id: schema.games.id,
                  startTime: schema.games.startTime,
                  verificationStatus: schema.games.verificationStatus,
                  rejectionReason: schema.games.rejectionReason,
                  warningFlags: schema.games.warningFlags,
                  mods: schema.games.mods,
                },
                orderBy: [asc(schema.games.startTime), asc(schema.games.id)],
                with: {
                  beatmap: {
                    columns: {
                      osuId: schema.beatmaps.osuId,
                      // TODO: Include all beatmap information.
                      // the Beatmaps tab on the tournaments page
                      // should be pre-loaded.
                    },
                  },
                },
              },
            },
          },
          tournamentAdminNotes: {
            columns: {
              id: schema.tournamentAdminNotes.id,
              referenceId: schema.tournamentAdminNotes.referenceId,
              note: schema.tournamentAdminNotes.note,
              created: schema.tournamentAdminNotes.created,
              updated: schema.tournamentAdminNotes.updated,
            },
            orderBy: [desc(schema.tournamentAdminNotes.created)],
            with: {
              user: {
                columns: {
                  id: schema.users.id,
                  playerId: schema.users.playerId,
                  lastLogin: schema.users.lastLogin,
                },
                with: {
                  player: {
                    columns: {
                      id: schema.players.id,
                      osuId: schema.players.osuId,
                      username: schema.players.username,
                      country: schema.players.country,
                      defaultRuleset: schema.players.defaultRuleset,
                    },
                  },
                },
              },
            },
          },
          playerTournamentStats: {
            columns: {
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
              averageRatingDelta:
                schema.playerTournamentStats.averageRatingDelta,
              averageScore: schema.playerTournamentStats.averageScore,
              averagePlacement: schema.playerTournamentStats.averagePlacement,
              averageAccuracy: schema.playerTournamentStats.averageAccuracy,
              teammateIds: schema.playerTournamentStats.teammateIds,
              matchWinRate: schema.playerTournamentStats.matchWinRate,
            },
            orderBy: [desc(schema.playerTournamentStats.averageMatchCost)],
            with: {
              player: {
                columns: {
                  id: schema.players.id,
                  osuId: schema.players.osuId,
                  username: schema.players.username,
                  country: schema.players.country,
                },
              },
            },
          },
          joinPooledBeatmaps: {
            with: {
              beatmap: {
                columns: {
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
                },
                with: {
                  beatmapset: {
                    columns: {
                      id: schema.beatmapsets.id,
                      osuId: schema.beatmapsets.osuId,
                      artist: schema.beatmapsets.artist,
                      title: schema.beatmapsets.title,
                      rankedStatus: schema.beatmapsets.rankedStatus,
                      rankedDate: schema.beatmapsets.rankedDate,
                      submittedDate: schema.beatmapsets.submittedDate,
                      creatorId: schema.beatmapsets.creatorId,
                    },
                    with: {
                      player: {
                        columns: {
                          id: schema.players.id,
                          osuId: schema.players.osuId,
                          username: schema.players.username,
                          country: schema.players.country,
                        },
                      },
                    },
                  },
                  joinBeatmapCreators: {
                    columns: {
                      creatorsId: schema.joinBeatmapCreators.creatorsId,
                    },
                    with: {
                      player: {
                        columns: {
                          id: schema.players.id,
                          osuId: schema.players.osuId,
                          username: schema.players.username,
                          country: schema.players.country,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!tournament) {
        throw new ORPCError('NOT_FOUND', {
          message: 'Tournament not found',
        });
      }

      type RawGame = {
        id: unknown;
        startTime?: string | null;
        endTime?: string | null;
        verificationStatus: unknown;
        rejectionReason: unknown;
        warningFlags: unknown;
        mods: unknown;
        beatmap?: { osuId: unknown } | null;
      };

      type RawMatch = {
        id: unknown;
        name: string;
        startTime?: string | null;
        endTime?: string | null;
        verificationStatus: unknown;
        rejectionReason: unknown;
        warningFlags: unknown;
        games?: RawGame[];
      };

      type RawAdminNote = {
        id: unknown;
        referenceId: unknown;
        note: string;
        created: string;
        updated?: string | null;
        user?: {
          id: unknown;
          lastLogin?: string | null;
          player?: {
            id: unknown;
            osuId: unknown;
            username: string;
            country?: string | null;
            defaultRuleset: unknown;
          };
        };
      };

      type RawPlayerStat = {
        id: unknown;
        playerId: unknown;
        tournamentId: unknown;
        matchesPlayed: unknown;
        matchesWon: unknown;
        matchesLost: unknown;
        gamesPlayed: unknown;
        gamesWon: unknown;
        gamesLost: unknown;
        averageMatchCost: unknown;
        averageRatingDelta: unknown;
        averageScore: unknown;
        averagePlacement: unknown;
        averageAccuracy: unknown;
        teammateIds?: unknown[];
        matchWinRate: unknown;
        player?: {
          id: unknown;
          osuId: unknown;
          username: string;
          country?: string | null;
        };
      };

      type RawJoinPooledBeatmap = {
        beatmap?: {
          id: unknown;
          osuId: unknown;
          ruleset: unknown;
          rankedStatus: unknown;
          diffName: string;
          totalLength: unknown;
          drainLength: unknown;
          bpm: unknown;
          countCircle: unknown;
          countSlider: unknown;
          countSpinner: unknown;
          cs: unknown;
          hp: unknown;
          od: unknown;
          ar: unknown;
          sr: unknown;
          maxCombo?: unknown;
          beatmapsetId?: unknown;
          beatmapset?: {
            id: unknown;
            osuId: unknown;
            artist: string;
            title: string;
            rankedStatus: unknown;
            rankedDate?: string | null;
            submittedDate?: string | null;
            creatorId?: unknown;
            player?: {
              id: unknown;
              osuId: unknown;
              username: string;
              country?: string | null;
            };
          };
          joinBeatmapCreators?: {
            player?: {
              id: unknown;
              osuId: unknown;
              username: string;
              country?: string | null;
            };
          }[];
        };
      };

      type RawTournament = {
        matches?: RawMatch[];
        tournamentAdminNotes?: RawAdminNote[];
        playerTournamentStats?: RawPlayerStat[];
        joinPooledBeatmaps?: RawJoinPooledBeatmap[];
      };

      const rawTournament = tournament as RawTournament;

      const matches = (rawTournament.matches ?? []).map((match) => ({
        id: Number(match.id),
        name: match.name,
        startTime: match.startTime ?? null,
        endTime: match.endTime ?? null,
        verificationStatus: Number(match.verificationStatus),
        rejectionReason: Number(match.rejectionReason),
        warningFlags: Number(match.warningFlags),
        games: (match.games ?? []).map((game) => ({
          id: Number(game.id),
          startTime: game.startTime ?? null,
          verificationStatus: Number(game.verificationStatus),
          rejectionReason: Number(game.rejectionReason),
          warningFlags: Number(game.warningFlags),
          mods: Number(game.mods),
          beatmap: game.beatmap
            ? {
                osuId: Number(game.beatmap.osuId),
              }
            : null,
        })),
      }));

      const adminNotes = (rawTournament.tournamentAdminNotes ?? []).map(
        (note) => {
          const user = note.user;
          const player = user?.player;

          return {
            id: Number(note.id),
            referenceId: Number(note.referenceId),
            note: note.note,
            created: note.created,
            updated: note.updated ?? null,
            adminUser:
              user && player
                ? {
                    id: Number(user.id),
                    lastLogin: user.lastLogin ?? null,
                    player: {
                      id: Number(player.id),
                      osuId: Number(player.osuId),
                      username: player.username,
                      country: player.country ?? null,
                      defaultRuleset: Number(player.defaultRuleset),
                      userId: Number(user.id),
                    },
                  }
                : {
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
        }
      );

      const playerStats = (rawTournament.playerTournamentStats ?? []).map(
        (stat) => ({
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
          player: stat.player
            ? {
                id: Number(stat.player.id),
                osuId: Number(stat.player.osuId),
                username: stat.player.username,
                country: stat.player.country ?? null,
              }
            : {
                id: -1,
                osuId: -1,
                username: 'Unknown',
                country: null,
              },
        })
      );

      const pooledBeatmaps = (rawTournament.joinPooledBeatmaps ?? [])
        .map((join) => join.beatmap)
        .filter((beatmap): beatmap is NonNullable<typeof beatmap> => !!beatmap)
        .map((beatmap) => {
          const beatmapset = beatmap.beatmapset;
          const beatmapsetPlayer = beatmapset?.player ?? null;

          return {
            id: Number(beatmap.id),
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
              beatmap.beatmapsetId === null ||
              beatmap.beatmapsetId === undefined
                ? null
                : Number(beatmap.beatmapsetId),
            beatmapset: beatmapset
              ? {
                  id: Number(beatmapset.id),
                  osuId: Number(beatmapset.osuId),
                  artist: beatmapset.artist,
                  title: beatmapset.title,
                  rankedStatus: Number(beatmapset.rankedStatus),
                  rankedDate: beatmapset.rankedDate ?? null,
                  submittedDate: beatmapset.submittedDate ?? null,
                  creatorId:
                    beatmapset.creatorId === null ||
                    beatmapset.creatorId === undefined
                      ? null
                      : Number(beatmapset.creatorId),
                  creator: beatmapsetPlayer
                    ? {
                        id: Number(beatmapsetPlayer.id),
                        osuId: Number(beatmapsetPlayer.osuId),
                        username: beatmapsetPlayer.username,
                        country: beatmapsetPlayer.country ?? null,
                      }
                    : null,
                }
              : null,
            attributes: [],
            creators: (beatmap.joinBeatmapCreators ?? [])
              .map((creator) => creator.player ?? null)
              .filter(
                (player): player is NonNullable<typeof player> => !!player
              )
              .map((player) => ({
                id: Number(player.id),
                osuId: Number(player.osuId),
                username: player.username,
                country: player.country ?? null,
              })),
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
        matches,
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

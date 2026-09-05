import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import * as schema from '@otr/core/db/schema';
import {
  BeatmapSearchResultSchema,
  MatchSearchResultSchema,
  PlayerSearchResultSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  TournamentSearchResultSchema,
} from '@/lib/orpc/schema/search';
import {
  buildBeatmapSearchExpressions,
  buildMatchSearchExpressions,
  buildPlayerSearchExpressions,
  buildTournamentSearchExpressions,
  parseSearchTerm,
} from '@/lib/orpc/queries/search';
import { buildTierProgress } from '@/lib/utils/tierProgress';
import { Ruleset, VerificationStatus } from '@otr/core/osu';

import { protectedProcedure } from './base';

const DEFAULT_RESULT_LIMIT = 5;

export const searchEntities = protectedProcedure
  .input(SearchRequestSchema)
  .output(SearchResponseSchema)
  .route({
    summary: 'Search entities',
    tags: ['authenticated'],
    method: 'GET',
    path: '/search',
  })
  .handler(async ({ input, context }) => {
    const emptyResponse = SearchResponseSchema.parse({
      players: [],
      tournaments: [],
      matches: [],
      beatmaps: [],
    });

    const parsed = parseSearchTerm(input.searchKey);
    if (!parsed) {
      return emptyResponse;
    }

    try {
      const {
        condition: playerCondition,
        rank: playerRank,
        currentUsernameMatched,
        matchedPreviousUsername,
      } = buildPlayerSearchExpressions(parsed);

      const { condition: tournamentCondition, order: tournamentOrder } =
        buildTournamentSearchExpressions(parsed, input.searchKey.trim());

      const { condition: matchCondition, rank: matchRank } =
        buildMatchSearchExpressions(parsed);

      const beatmapSearch = buildBeatmapSearchExpressions(input.searchKey)!;
      const { condition: beatmapCondition, rank: beatmapCombinedScore } =
        beatmapSearch;

      const session = context.session as
        { dbPlayer?: { id?: number | null } | null } | undefined;
      const currentPlayerId = session?.dbPlayer?.id;

      let friendIds: Set<number> = new Set();
      if (currentPlayerId) {
        const friendRows = await context.db
          .select({ friendId: schema.playerFriends.friendId })
          .from(schema.playerFriends)
          .where(eq(schema.playerFriends.playerId, currentPlayerId));
        friendIds = new Set(friendRows.map((row) => Number(row.friendId)));
      }

      const [playerRows, tournamentRows, matchRows, beatmapRows] =
        await Promise.all([
          context.db
            .select({
              id: schema.players.id,
              osuId: schema.players.osuId,
              username: schema.players.username,
              defaultRuleset: schema.players.defaultRuleset,
              rating: schema.playerRatings.rating,
              ratingRuleset: schema.playerRatings.ruleset,
              globalRank: schema.playerRatings.globalRank,
              matchedPreviousUsername,
            })
            .from(schema.players)
            .leftJoin(
              schema.playerRatings,
              and(
                eq(schema.playerRatings.playerId, schema.players.id),
                eq(schema.playerRatings.ruleset, schema.players.defaultRuleset)
              )
            )
            .where(playerCondition)
            .orderBy(
              desc(currentUsernameMatched),
              desc(playerRank),
              sql`${schema.playerRatings.rating} desc nulls last`,
              asc(schema.players.username)
            )
            .limit(DEFAULT_RESULT_LIMIT),
          context.db
            .select({
              id: schema.tournaments.id,
              name: schema.tournaments.name,
              abbreviation: schema.tournaments.abbreviation,
              ruleset: schema.tournaments.ruleset,
              verificationStatus: schema.tournaments.verificationStatus,
              rejectionReason: schema.tournaments.rejectionReason,
              lobbySize: schema.tournaments.lobbySize,
              isLazer: schema.tournaments.isLazer,
            })
            .from(schema.tournaments)
            .where(tournamentCondition)
            .orderBy(...tournamentOrder)
            .limit(DEFAULT_RESULT_LIMIT),
          context.db
            .select({
              id: schema.matches.id,
              osuId: schema.matches.osuId,
              name: schema.matches.name,
              tournamentName: schema.tournaments.name,
            })
            .from(schema.matches)
            .leftJoin(
              schema.tournaments,
              eq(schema.matches.tournamentId, schema.tournaments.id)
            )
            .where(matchCondition)
            .orderBy(
              desc(matchRank),
              sql`${schema.matches.startTime} desc nulls last`,
              asc(schema.matches.name)
            )
            .limit(DEFAULT_RESULT_LIMIT),
          (() => {
            const beatmapsetCreator = alias(
              schema.players,
              'beatmapsetCreator'
            );
            return context.db
              .select({
                id: schema.beatmaps.id,
                osuId: schema.beatmaps.osuId,
                diffName: schema.beatmaps.diffName,
                sr: schema.beatmaps.sr,
                ruleset: schema.beatmaps.ruleset,
                artist:
                  sql`coalesce(${schema.beatmaps.artistOverride}, ${schema.beatmapsets.artist})`.as(
                    'artist'
                  ),
                title:
                  sql`coalesce(${schema.beatmaps.titleOverride}, ${schema.beatmapsets.title})`.as(
                    'title'
                  ),
                creator: beatmapsetCreator.username,
                beatmapsetOsuId: schema.beatmapsets.osuId,
                gameCount: schema.beatmapStats.verifiedGameCount,
                tournamentCount: schema.beatmapStats.verifiedTournamentCount,
              })
              .from(schema.beatmaps)
              .leftJoin(
                schema.beatmapsets,
                eq(schema.beatmaps.beatmapsetId, schema.beatmapsets.id)
              )
              .leftJoin(
                beatmapsetCreator,
                eq(schema.beatmapsets.creatorId, beatmapsetCreator.id)
              )
              .leftJoin(
                schema.beatmapStats,
                eq(schema.beatmaps.id, schema.beatmapStats.beatmapId)
              )
              .where(beatmapCondition)
              .orderBy(
                desc(beatmapCombinedScore),
                asc(schema.beatmaps.diffName)
              )
              .limit(DEFAULT_RESULT_LIMIT);
          })(),
        ]);

      const players = playerRows.map((row) => {
        const rating =
          row.rating === null || row.rating === undefined
            ? null
            : Number(row.rating);
        const globalRank =
          row.globalRank === null || row.globalRank === undefined
            ? null
            : Number(row.globalRank);
        const rulesetValue = row.ratingRuleset ?? row.defaultRuleset ?? null;
        const ruleset =
          rulesetValue === null || rulesetValue === undefined
            ? null
            : (rulesetValue as Ruleset);
        const tierProgress =
          rating !== null ? buildTierProgress(rating).tierProgress : null;
        const playerId = Number(row.id);

        return PlayerSearchResultSchema.parse({
          id: playerId,
          osuId: Number(row.osuId),
          username: row.username,
          rating,
          ruleset,
          globalRank,
          tierProgress,
          isFriend: friendIds.has(playerId),
          matchedPreviousUsername: row.matchedPreviousUsername ?? null,
        });
      });

      const tournaments = tournamentRows.map((row) =>
        TournamentSearchResultSchema.parse({
          id: Number(row.id),
          name: row.name,
          ruleset: row.ruleset as Ruleset,
          verificationStatus: row.verificationStatus as VerificationStatus,
          rejectionReason: Number(row.rejectionReason),
          lobbySize: Number(row.lobbySize),
          abbreviation: row.abbreviation ?? null,
          isLazer: row.isLazer,
        })
      );

      const matches = matchRows.map((row) =>
        MatchSearchResultSchema.parse({
          id: Number(row.id),
          osuId:
            row.osuId === null || row.osuId === undefined
              ? null
              : Number(row.osuId),
          name: row.name,
          tournamentName: row.tournamentName ?? 'Unknown tournament',
        })
      );

      const beatmaps = beatmapRows.map((row) =>
        BeatmapSearchResultSchema.parse({
          id: Number(row.id),
          osuId: Number(row.osuId),
          diffName: row.diffName,
          sr: Number(row.sr),
          ruleset: row.ruleset as Ruleset,
          artist: row.artist ?? 'Unknown',
          title: row.title ?? 'Unknown',
          creator: row.creator ?? null,
          beatmapsetOsuId: row.beatmapsetOsuId
            ? Number(row.beatmapsetOsuId)
            : null,
          gameCount: Number(row.gameCount ?? 0),
          tournamentCount: Number(row.tournamentCount ?? 0),
        })
      );

      return SearchResponseSchema.parse({
        players,
        tournaments,
        matches,
        beatmaps,
      });
    } catch (error) {
      console.error('[orpc] search.query failed', error);

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to perform search operation',
      });
    }
  });

import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, sql, type AnyColumn, type SQL } from 'drizzle-orm';
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
  buildSimilarity,
  buildTrigramMatch,
  buildTrigramPrecision,
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

    const { tsQuery, prefixTsQuery } = parsed;

    const similarity = (column: AnyColumn | SQL) =>
      buildSimilarity(column, parsed);
    const trigramMatch = (column: AnyColumn) =>
      buildTrigramMatch(column, parsed);

    try {
      const playerVector = schema.players.searchVector;
      const playerSimilarity = similarity(schema.players.username);
      // `%>` nominates candidates from the index; the precision half filters them
      const playerTrigram = sql`(${trigramMatch(schema.players.username)} AND ${buildTrigramPrecision(
        [schema.players.username],
        parsed
      )})`;
      const playerCondition = prefixTsQuery
        ? sql`(${playerVector} @@ ${tsQuery} OR ${playerVector} @@ ${prefixTsQuery} OR ${playerTrigram})`
        : sql`(${playerVector} @@ ${tsQuery} OR ${playerTrigram})`;
      const playerRank = prefixTsQuery
        ? sql`greatest(ts_rank_cd(${playerVector}, ${tsQuery}), ts_rank_cd(${playerVector}, ${prefixTsQuery}), ${playerSimilarity})`
        : sql`greatest(ts_rank_cd(${playerVector}, ${tsQuery}), ${playerSimilarity})`;

      const tournamentVector = schema.tournaments.searchVector;
      const tournamentNameSimilarity = similarity(schema.tournaments.name);
      const tournamentAbbreviationSimilarity = similarity(
        schema.tournaments.abbreviation
      );
      const tournamentSimilarity = sql`greatest(${tournamentNameSimilarity}, ${tournamentAbbreviationSimilarity})`;
      const tournamentTrigram = sql`((${trigramMatch(schema.tournaments.name)} OR ${trigramMatch(schema.tournaments.abbreviation)}) AND ${buildTrigramPrecision(
        [schema.tournaments.name, schema.tournaments.abbreviation],
        parsed
      )})`;
      const tournamentCondition = prefixTsQuery
        ? sql`(${tournamentVector} @@ ${tsQuery} OR ${tournamentVector} @@ ${prefixTsQuery} OR ${tournamentTrigram})`
        : sql`(${tournamentVector} @@ ${tsQuery} OR ${tournamentTrigram})`;
      const tournamentRank = prefixTsQuery
        ? sql`greatest(ts_rank_cd(${tournamentVector}, ${tsQuery}), ts_rank_cd(${tournamentVector}, ${prefixTsQuery}), ${tournamentSimilarity})`
        : sql`greatest(ts_rank_cd(${tournamentVector}, ${tsQuery}), ${tournamentSimilarity})`;

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
            .orderBy(
              desc(tournamentRank),
              sql`${schema.tournaments.endTime} desc nulls last`,
              asc(schema.tournaments.name)
            )
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
            const setOwnerOverride = alias(schema.players, 'setOwnerOverride');
            return context.db
              .select({
                id: schema.beatmaps.id,
                osuId: schema.beatmaps.osuId,
                diffName: schema.beatmaps.diffName,
                sr: schema.beatmaps.sr,
                ruleset: schema.beatmaps.ruleset,
                artist: sql<
                  string | null
                >`coalesce(${schema.beatmaps.artistOverride}, ${schema.beatmapsets.artist})`,
                title: sql<
                  string | null
                >`coalesce(${schema.beatmaps.titleOverride}, ${schema.beatmapsets.title})`,
                creator: sql<
                  string | null
                >`coalesce(${setOwnerOverride.username}, ${beatmapsetCreator.username})`,
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
                setOwnerOverride,
                eq(schema.beatmaps.setOwnerIdOverride, setOwnerOverride.id)
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

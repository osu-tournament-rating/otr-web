import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, sql, type AnyColumn, type SQL } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import {
  BeatmapSearchResultSchema,
  MatchSearchResultSchema,
  PlayerSearchResultSchema,
  SearchRequestSchema,
  SearchResponseSchema,
  TournamentSearchResultSchema,
} from '@/lib/orpc/schema/search';
import { buildTierProgress } from '@/lib/utils/tierProgress';
import { Ruleset, VerificationStatus } from '@otr/core/osu';

import { protectedProcedure } from './base';

const DEFAULT_RESULT_LIMIT = 5;
const SIMILARITY_THRESHOLD = 0.3;

const normalizeSearchTerm = (value: string) =>
  value
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildPrefixQuery = (tokens: readonly string[]) =>
  tokens.length === 0
    ? null
    : tokens
        .map((token) => {
          const safeToken = token.replace(/'/g, "''");
          return `'${safeToken}':*`;
        })
        .join(' & ');

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
    const term = input.searchKey.trim();

    if (!term) {
      return SearchResponseSchema.parse({
        players: [],
        tournaments: [],
        matches: [],
        beatmaps: [],
      });
    }

    const normalizedTerm = normalizeSearchTerm(term);

    if (!normalizedTerm) {
      return SearchResponseSchema.parse({
        players: [],
        tournaments: [],
        matches: [],
        beatmaps: [],
      });
    }

    const tokens = normalizedTerm.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      return SearchResponseSchema.parse({
        players: [],
        tournaments: [],
        matches: [],
        beatmaps: [],
      });
    }

    const prefixQueryText = buildPrefixQuery(tokens);
    // Use the plain parser for natural-language matches and a prefix query so users can search by partial tokens.
    const tsQuery = sql`plainto_tsquery('simple', ${normalizedTerm})`;
    const prefixTsQuery = prefixQueryText
      ? sql`to_tsquery('simple', ${prefixQueryText})`
      : null;

    const primaryToken = tokens[0] ?? normalizedTerm;
    const hasDistinctPrimaryToken = primaryToken !== normalizedTerm;
    const buildSimilarity = (column: AnyColumn | SQL) =>
      hasDistinctPrimaryToken
        ? sql`greatest(similarity(${column}, ${normalizedTerm}), similarity(${column}, ${primaryToken}))`
        : sql`similarity(${column}, ${normalizedTerm})`;

    try {
      const playerVector = schema.players.searchVector;
      const playerSimilarity = buildSimilarity(schema.players.username);
      // Players match if they satisfy either the full-term or prefix query; the dual check helps partial matches without sacrificing exact ones.
      const playerCondition = prefixTsQuery
        ? sql`(${playerVector} @@ ${tsQuery} OR ${playerVector} @@ ${prefixTsQuery} OR ${playerSimilarity} >= ${SIMILARITY_THRESHOLD})`
        : sql`(${playerVector} @@ ${tsQuery} OR ${playerSimilarity} >= ${SIMILARITY_THRESHOLD})`;
      // Rank players by whichever query produced the highest score so prefix hits can bubble above weaker full-term matches.
      const playerRank = prefixTsQuery
        ? sql`greatest(ts_rank_cd(${playerVector}, ${tsQuery}), ts_rank_cd(${playerVector}, ${prefixTsQuery}), ${playerSimilarity})`
        : sql`greatest(ts_rank_cd(${playerVector}, ${tsQuery}), ${playerSimilarity})`;

      const tournamentVector = schema.tournaments.searchVector;
      const tournamentNameSimilarity = buildSimilarity(schema.tournaments.name);
      const tournamentAbbreviationSimilarity = buildSimilarity(
        schema.tournaments.abbreviation
      );
      const tournamentSimilarity = sql`greatest(${tournamentNameSimilarity}, ${tournamentAbbreviationSimilarity})`;
      // Apply the same full vs prefix matching strategy for tournaments to keep behavior consistent across entities.
      const tournamentCondition = prefixTsQuery
        ? sql`(${tournamentVector} @@ ${tsQuery} OR ${tournamentVector} @@ ${prefixTsQuery} OR ${tournamentSimilarity} >= ${SIMILARITY_THRESHOLD})`
        : sql`(${tournamentVector} @@ ${tsQuery} OR ${tournamentSimilarity} >= ${SIMILARITY_THRESHOLD})`;
      // Favor the strongest relevance score from either query path when ordering tournament results.
      const tournamentRank = prefixTsQuery
        ? sql`greatest(ts_rank_cd(${tournamentVector}, ${tsQuery}), ts_rank_cd(${tournamentVector}, ${prefixTsQuery}), ${tournamentSimilarity})`
        : sql`greatest(ts_rank_cd(${tournamentVector}, ${tsQuery}), ${tournamentSimilarity})`;

      // Matches stitch in tournament metadata to boost relevance when users search by tourney identifiers or abbreviations.
      const matchVector = sql`
        ${schema.matches.searchVector}
        || setweight(to_tsvector('simple', coalesce(${schema.tournaments.name}, '')), 'B')
        || setweight(
          to_tsvector(
            'simple',
            regexp_replace(coalesce(${schema.tournaments.name}, ''), '([A-Za-z]+)([0-9]+)', '\\1 \\2', 'g')
          ),
          'C'
        )
        || setweight(to_tsvector('simple', coalesce(${schema.tournaments.abbreviation}, '')), 'D')
      `;
      const matchNameSimilarity = buildSimilarity(schema.matches.name);
      const matchTournamentNameSimilarity = buildSimilarity(
        sql`coalesce(${schema.tournaments.name}, '')`
      );
      const matchTournamentAbbreviationSimilarity = buildSimilarity(
        sql`coalesce(${schema.tournaments.abbreviation}, '')`
      );
      const matchSimilarity = sql`greatest(${matchNameSimilarity}, ${matchTournamentNameSimilarity}, ${matchTournamentAbbreviationSimilarity})`;
      // Allow either query to satisfy the match vector so partial tournament text still finds the right match records.
      const matchCondition = prefixTsQuery
        ? sql`(${matchVector} @@ ${tsQuery} OR ${matchVector} @@ ${prefixTsQuery} OR ${matchSimilarity} >= ${SIMILARITY_THRESHOLD})`
        : sql`(${matchVector} @@ ${tsQuery} OR ${matchSimilarity} >= ${SIMILARITY_THRESHOLD})`;
      // Rank matches using the highest relevance from the two query shapes to reflect the most confident hit.
      const matchRank = prefixTsQuery
        ? sql`greatest(ts_rank_cd(${matchVector}, ${tsQuery}), ts_rank_cd(${matchVector}, ${prefixTsQuery}), ${matchSimilarity})`
        : sql`greatest(ts_rank_cd(${matchVector}, ${tsQuery}), ${matchSimilarity})`;

      // Beatmaps combine diffName with beatmapset artist/title for search
      const beatmapVector = sql`
        ${schema.beatmaps.searchVector}
        || setweight(to_tsvector('simple', coalesce(${schema.beatmapsets.artist}, '')), 'B')
        || setweight(to_tsvector('simple', coalesce(${schema.beatmapsets.title}, '')), 'B')
      `;
      const beatmapDiffSimilarity = buildSimilarity(schema.beatmaps.diffName);
      const beatmapArtistSimilarity = buildSimilarity(
        sql`coalesce(${schema.beatmapsets.artist}, '')`
      );
      const beatmapTitleSimilarity = buildSimilarity(
        sql`coalesce(${schema.beatmapsets.title}, '')`
      );
      const beatmapSimilarity = sql`greatest(${beatmapDiffSimilarity}, ${beatmapArtistSimilarity}, ${beatmapTitleSimilarity})`;
      const beatmapCondition = prefixTsQuery
        ? sql`(${beatmapVector} @@ ${tsQuery} OR ${beatmapVector} @@ ${prefixTsQuery} OR ${beatmapSimilarity} >= ${SIMILARITY_THRESHOLD})`
        : sql`(${beatmapVector} @@ ${tsQuery} OR ${beatmapSimilarity} >= ${SIMILARITY_THRESHOLD})`;
      const beatmapRank = prefixTsQuery
        ? sql`greatest(ts_rank_cd(${beatmapVector}, ${tsQuery}), ts_rank_cd(${beatmapVector}, ${prefixTsQuery}), ${beatmapSimilarity})`
        : sql`greatest(ts_rank_cd(${beatmapVector}, ${tsQuery}), ${beatmapSimilarity})`;

      // Subqueries for beatmap popularity (on-the-fly calculation, verified data only)
      const beatmapGameCountSubquery = sql<number>`(
        SELECT COUNT(DISTINCT g.id)::int
        FROM ${schema.games} g
        INNER JOIN ${schema.matches} m ON m.id = g.match_id
        INNER JOIN ${schema.tournaments} t ON t.id = m.tournament_id
        WHERE g.beatmap_id = ${schema.beatmaps.id}
          AND t.verification_status = ${VerificationStatus.Verified}
          AND m.verification_status = ${VerificationStatus.Verified}
          AND g.verification_status = ${VerificationStatus.Verified}
      )`;
      const beatmapTournamentCountSubquery = sql<number>`(
        SELECT COUNT(DISTINCT t.id)::int
        FROM ${schema.joinPooledBeatmaps} jpb
        INNER JOIN ${schema.tournaments} t ON t.id = jpb.tournaments_pooled_in_id
        WHERE jpb.pooled_beatmaps_id = ${schema.beatmaps.id}
          AND t.verification_status = ${VerificationStatus.Verified}
      )`;

      // Combined score: 70% text relevance + 30% log-normalized popularity
      // Log scale prevents extremely popular beatmaps from overwhelming relevance
      const beatmapCombinedScore = sql`(
        (${beatmapRank}) * 0.7 +
        (ln(COALESCE((${beatmapGameCountSubquery}), 0) + 1) / 10.0) * 0.3
      )`;

      const session = context.session as
        | { dbPlayer?: { id?: number | null } | null }
        | undefined;
      const currentPlayerId = session?.dbPlayer?.id;

      let friendIds: Set<number> = new Set();
      if (currentPlayerId) {
        const friendRows = await context.db
          .select({ friendId: schema.playerFriends.friendId })
          .from(schema.playerFriends)
          .where(eq(schema.playerFriends.playerId, currentPlayerId));
        friendIds = new Set(friendRows.map((row) => Number(row.friendId)));
      }

      const [playerRows, tournamentRows, matchRows, beatmapRows] = await Promise.all([
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
        context.db
          .select({
            id: schema.beatmaps.id,
            osuId: schema.beatmaps.osuId,
            diffName: schema.beatmaps.diffName,
            sr: schema.beatmaps.sr,
            ruleset: schema.beatmaps.ruleset,
            artist: schema.beatmapsets.artist,
            title: schema.beatmapsets.title,
            beatmapsetOsuId: schema.beatmapsets.osuId,
            gameCount: beatmapGameCountSubquery,
            tournamentCount: beatmapTournamentCountSubquery,
          })
          .from(schema.beatmaps)
          .leftJoin(
            schema.beatmapsets,
            eq(schema.beatmaps.beatmapsetId, schema.beatmapsets.id)
          )
          .where(beatmapCondition)
          .orderBy(
            desc(beatmapCombinedScore),
            asc(schema.beatmaps.diffName)
          )
          .limit(DEFAULT_RESULT_LIMIT),
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
          beatmapsetOsuId: row.beatmapsetOsuId ? Number(row.beatmapsetOsuId) : null,
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

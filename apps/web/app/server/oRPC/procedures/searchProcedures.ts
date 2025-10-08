import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, sql, type AnyColumn, type SQL } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import {
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
    summary: 'Search players, tournaments, and matches',
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
      });
    }

    const normalizedTerm = normalizeSearchTerm(term);

    if (!normalizedTerm) {
      return SearchResponseSchema.parse({
        players: [],
        tournaments: [],
        matches: [],
      });
    }

    const tokens = normalizedTerm.split(/\s+/).filter(Boolean);

    if (tokens.length === 0) {
      return SearchResponseSchema.parse({
        players: [],
        tournaments: [],
        matches: [],
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

      const [playerRows, tournamentRows, matchRows] = await Promise.all([
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

        return PlayerSearchResultSchema.parse({
          id: Number(row.id),
          osuId: Number(row.osuId),
          username: row.username,
          rating,
          ruleset,
          globalRank,
          tierProgress,
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

      return SearchResponseSchema.parse({
        players,
        tournaments,
        matches,
      });
    } catch (error) {
      console.error('[orpc] search.query failed', error);

      throw new ORPCError('INTERNAL_SERVER_ERROR', {
        message: 'Failed to perform search operation',
      });
    }
  });

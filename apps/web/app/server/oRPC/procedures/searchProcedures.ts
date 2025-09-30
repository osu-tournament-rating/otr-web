import { ORPCError } from '@orpc/server';
import { and, asc, desc, eq, ilike, or, sql } from 'drizzle-orm';

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
const LIKE_ESCAPE_PATTERN = /[%_\\]/g;

const escapeLikePattern = (value: string) =>
  value.replace(LIKE_ESCAPE_PATTERN, (match) => `\\${match}`);

export const searchEntities = protectedProcedure
  .input(SearchRequestSchema)
  .output(SearchResponseSchema)
  .route({
    summary: 'Search players, tournaments, and matches',
    tags: ['authenticated'],
    path: '/search/query',
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

    const searchPattern = `%${escapeLikePattern(term)}%`;

    try {
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
          .where(ilike(schema.players.username, searchPattern))
          .orderBy(
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
          .where(
            or(
              ilike(schema.tournaments.name, searchPattern),
              ilike(schema.tournaments.abbreviation, searchPattern)
            )
          )
          .orderBy(
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
          .where(ilike(schema.matches.name, searchPattern))
          .orderBy(desc(schema.matches.startTime), asc(schema.matches.name))
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
        message:
          error instanceof Error
            ? error.message
            : 'Failed to perform search operation',
      });
    }
  });

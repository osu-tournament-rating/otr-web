import {
  asc,
  desc,
  ilike,
  type AnyColumn,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import type { LeaderboardSort } from '@/lib/orpc/schema/leaderboard';

import { containsPattern } from './likePattern';

type Column = SQLWrapper | AnyColumn;

/** The leaderboard columns a sort reads. */
export type LeaderboardOrderColumns = {
  rating: Column;
  tournamentsPlayed: Column;
  matchesPlayed: Column;
  winRate: Column;
  ratingGlobalRank: Column;
  playerId: Column;
};

/**
 * The leaderboard's order. With neither `sort` nor `descending` it is global
 * rank order, as it always was. A sort without a direction is descending.
 * Ties fall back to global rank, best first, then player ID, so a page
 * boundary never splits or repeats a row.
 */
export function buildLeaderboardOrder(
  columns: LeaderboardOrderColumns,
  sort: LeaderboardSort | undefined,
  descending: boolean | undefined
): SQL[] {
  if (sort === undefined && descending === undefined) {
    return [asc(columns.ratingGlobalRank), asc(columns.playerId)];
  }

  const isDescending = descending ?? true;
  const direction = (column: Column) =>
    isDescending ? desc(column) : asc(column);

  switch (sort ?? 'rating') {
    case 'rating':
      // Lowest rating first reverses the whole ranking, ties included.
      return isDescending
        ? [
            desc(columns.rating),
            asc(columns.ratingGlobalRank),
            asc(columns.playerId),
          ]
        : [
            asc(columns.rating),
            desc(columns.ratingGlobalRank),
            desc(columns.playerId),
          ];
    case 'tournaments':
      return [
        direction(columns.tournamentsPlayed),
        asc(columns.ratingGlobalRank),
        asc(columns.playerId),
      ];
    case 'matches':
      return [
        direction(columns.matchesPlayed),
        asc(columns.ratingGlobalRank),
        asc(columns.playerId),
      ];
    case 'winRate':
      return [
        direction(columns.winRate),
        asc(columns.ratingGlobalRank),
        asc(columns.playerId),
      ];
  }
}

/** Players whose username contains `searchQuery`, ignoring case. */
export function buildLeaderboardSearchCondition(
  searchQuery: string | undefined
): SQL | undefined {
  const term = searchQuery?.trim();

  if (!term) {
    return undefined;
  }

  return ilike(schema.players.username, containsPattern(term));
}

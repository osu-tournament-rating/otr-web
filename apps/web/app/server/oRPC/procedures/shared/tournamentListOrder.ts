import { asc, desc, sql, type AnyColumn, type SQL } from 'drizzle-orm';

import * as schema from '@otr/core/db/schema';
import { TournamentQuerySortType } from '@otr/core/osu';

import { containsPattern, escapeLikePattern } from './likePattern';

/**
 * The tournament list's order. The ID comes last as a tie-break: many rows
 * share a lobby size or a date, and without a unique key Postgres may order
 * tied rows differently from one page to the next, so numbered pages would
 * repeat some tournaments and skip others.
 */
export function buildTournamentListOrder({
  sort,
  descending,
  searchTerm,
}: {
  sort: TournamentQuerySortType | undefined;
  descending: boolean | undefined;
  /** The trimmed search term, for relevance order. */
  searchTerm: string | undefined;
}): SQL[] {
  const sortValue = sort ?? TournamentQuerySortType.EndTime;
  const isDescending = descending ?? true;
  const direction = (column: AnyColumn) =>
    isDescending ? desc(column) : asc(column);

  switch (sortValue) {
    case TournamentQuerySortType.Id:
      return [direction(schema.tournaments.id)];
    case TournamentQuerySortType.StartTime:
      return [
        direction(schema.tournaments.startTime),
        direction(schema.tournaments.id),
      ];
    case TournamentQuerySortType.LobbySize:
      return [
        direction(schema.tournaments.lobbySize),
        direction(schema.tournaments.id),
      ];
    case TournamentQuerySortType.SubmissionDate:
      return [
        direction(schema.tournaments.created),
        direction(schema.tournaments.id),
      ];
    case TournamentQuerySortType.SearchQueryRelevance: {
      // Best match first whatever the direction, then the newest submission
      const order: SQL[] = [];

      if (searchTerm) {
        const searchPattern = containsPattern(searchTerm);
        const searchPrefixPattern = `${escapeLikePattern(searchTerm)}%`;

        order.push(
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

      return [
        ...order,
        desc(schema.tournaments.created),
        desc(schema.tournaments.id),
      ];
    }
    case TournamentQuerySortType.EndTime:
    default:
      return [
        direction(schema.tournaments.endTime),
        direction(schema.tournaments.id),
      ];
  }
}

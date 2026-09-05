import { TournamentQuerySortType } from '@otr/core/osu';

export const DEFAULT_TOURNAMENT_SORT = TournamentQuerySortType.EndTime;

/**
 * A search sorts by relevance unless the user chose a sort. Relevance means
 * nothing without a search, so it falls back to the default.
 */
export function resolveTournamentSort(
  sort: TournamentQuerySortType | undefined,
  searchQuery: string | undefined
): TournamentQuerySortType {
  const searching = Boolean(searchQuery?.trim());

  if (sort === undefined) {
    return searching
      ? TournamentQuerySortType.SearchQueryRelevance
      : DEFAULT_TOURNAMENT_SORT;
  }

  return sort === TournamentQuerySortType.SearchQueryRelevance && !searching
    ? DEFAULT_TOURNAMENT_SORT
    : sort;
}

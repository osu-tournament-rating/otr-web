import { describe, expect, it } from 'bun:test';

import { TournamentQuerySortType } from '@otr/core/osu';

import { resolveTournamentSort } from '../tournament-sort';

describe('resolveTournamentSort', () => {
  it('sorts a search by relevance when no sort was chosen', () => {
    expect(resolveTournamentSort(undefined, 'owc')).toBe(
      TournamentQuerySortType.SearchQueryRelevance
    );
  });

  it('keeps a chosen sort while searching', () => {
    expect(
      resolveTournamentSort(TournamentQuerySortType.StartTime, 'owc')
    ).toBe(TournamentQuerySortType.StartTime);
    expect(resolveTournamentSort(TournamentQuerySortType.EndTime, 'owc')).toBe(
      TournamentQuerySortType.EndTime
    );
  });

  it('falls back to completion date without a search', () => {
    expect(resolveTournamentSort(undefined, undefined)).toBe(
      TournamentQuerySortType.EndTime
    );
    expect(resolveTournamentSort(undefined, '   ')).toBe(
      TournamentQuerySortType.EndTime
    );
    expect(
      resolveTournamentSort(TournamentQuerySortType.SearchQueryRelevance, '')
    ).toBe(TournamentQuerySortType.EndTime);
  });
});

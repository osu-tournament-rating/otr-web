import { describe, expect, it } from 'bun:test';

import { getListToolbarLayout } from '../toolbar';

describe('getListToolbarLayout', () => {
  it('puts search, sort and Filters first and the scope line second', () => {
    expect(
      getListToolbarLayout({
        search: true,
        sort: true,
        filters: true,
        rulesets: true,
        view: true,
        count: true,
      })
    ).toEqual({
      searchRow: true,
      scopeRow: true,
      leading: null,
      controls: 'search',
      count: 'scope',
    });
  });

  it('keeps a lone count beside the search, not on a row of its own', () => {
    expect(
      getListToolbarLayout({ search: true, filters: true, count: true })
    ).toEqual({
      searchRow: true,
      scopeRow: false,
      leading: null,
      controls: 'search',
      count: 'search',
    });
  });

  it('makes a list without a search one strip: scope, count, then sort', () => {
    expect(
      getListToolbarLayout({ sort: true, scope: true, count: true })
    ).toEqual({
      searchRow: false,
      scopeRow: true,
      leading: null,
      controls: 'scope',
      count: 'scope',
    });
  });

  it('puts leading before the search, or before the scope without one', () => {
    expect(getListToolbarLayout({ search: true, leading: true }).leading).toBe(
      'search'
    );
    const noSearch = getListToolbarLayout({ leading: true, filters: true });
    expect(noSearch.leading).toBe('scope');
    expect(noSearch.controls).toBe('scope');
    expect(noSearch.searchRow).toBe(false);
  });

  it('draws nothing for a toolbar with no slots', () => {
    expect(getListToolbarLayout({})).toEqual({
      searchRow: false,
      scopeRow: false,
      leading: null,
      controls: null,
      count: null,
    });
  });
});

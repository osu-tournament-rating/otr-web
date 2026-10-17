import { describe, expect, it } from 'bun:test';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

import { TournamentQuerySortType, VerificationStatus } from '@otr/core/osu';

import {
  buildTournamentListOrder,
  buildTournamentRelevanceOrder,
} from '../tournamentListOrder';

const dialect = new PgDialect();

const render = (order: SQL[]) =>
  order.map((part) => dialect.sqlToQuery(part).sql.replace(/\s+/g, ' '));

describe('buildTournamentListOrder', () => {
  it('defaults to the latest end time first, then the ID', () => {
    expect(
      render(
        buildTournamentListOrder({
          sort: undefined,
          descending: undefined,
          searchTerm: undefined,
        })
      )
    ).toEqual(['"tournaments"."end_time" desc', '"tournaments"."id" desc']);
  });

  it.each([
    [TournamentQuerySortType.StartTime, '"tournaments"."start_time"'],
    [TournamentQuerySortType.EndTime, '"tournaments"."end_time"'],
    [TournamentQuerySortType.LobbySize, '"tournaments"."lobby_size"'],
    [TournamentQuerySortType.SubmissionDate, '"tournaments"."created"'],
  ])('breaks ties on sort %p by ID in the same direction', (sort, column) => {
    expect(
      render(
        buildTournamentListOrder({
          sort,
          descending: false,
          searchTerm: undefined,
        })
      )
    ).toEqual([`${column} asc`, '"tournaments"."id" asc']);
    expect(
      render(
        buildTournamentListOrder({
          sort,
          descending: true,
          searchTerm: undefined,
        })
      )
    ).toEqual([`${column} desc`, '"tournaments"."id" desc']);
  });

  it('sorts by ID alone when asked to', () => {
    expect(
      render(
        buildTournamentListOrder({
          sort: TournamentQuerySortType.Id,
          descending: false,
          searchTerm: undefined,
        })
      )
    ).toEqual(['"tournaments"."id" asc']);
  });

  it('puts the best search match first, then the newest submission', () => {
    const order = buildTournamentListOrder({
      sort: TournamentQuerySortType.SearchQueryRelevance,
      descending: false,
      searchTerm: 'o_wc',
    });
    const rendered = render(order);

    expect(rendered).toHaveLength(4);
    expect(rendered.slice(0, 2)).toEqual(
      render(buildTournamentRelevanceOrder('o_wc'))
    );
    expect(rendered.slice(2)).toEqual([
      '"tournaments"."created" desc',
      '"tournaments"."id" desc',
    ]);
  });

  it('falls back to the newest submission for relevance without a term', () => {
    expect(
      render(
        buildTournamentListOrder({
          sort: TournamentQuerySortType.SearchQueryRelevance,
          descending: true,
          searchTerm: undefined,
        })
      )
    ).toEqual(['"tournaments"."created" desc', '"tournaments"."id" desc']);
  });
});

describe('buildTournamentRelevanceOrder', () => {
  it('puts verified tournaments first', () => {
    const [verified] = buildTournamentRelevanceOrder('owc');

    expect(render([verified!])).toEqual([
      '"tournaments"."verification_status" = $1 desc',
    ]);
    expect(dialect.sqlToQuery(verified!).params).toEqual([
      VerificationStatus.Verified,
    ]);
  });

  it('ranks exact, then prefix, then substring matches, abbreviation first', () => {
    const [, match] = buildTournamentRelevanceOrder('o_wc');

    expect(render([match!])).toEqual([
      'CASE' +
        ' WHEN "tournaments"."abbreviation" ILIKE $1 THEN 5' +
        ' WHEN "tournaments"."name" ILIKE $2 THEN 4' +
        ' WHEN "tournaments"."abbreviation" ILIKE $3 THEN 3' +
        ' WHEN "tournaments"."name" ILIKE $4 THEN 2' +
        ' WHEN "tournaments"."name" ILIKE $5' +
        ' OR "tournaments"."abbreviation" ILIKE $6 THEN 1' +
        ' ELSE 0 END desc',
    ]);
    expect(dialect.sqlToQuery(match!).params).toEqual([
      'o\\_wc',
      'o\\_wc',
      'o\\_wc%',
      'o\\_wc%',
      '%o\\_wc%',
      '%o\\_wc%',
    ]);
  });
});

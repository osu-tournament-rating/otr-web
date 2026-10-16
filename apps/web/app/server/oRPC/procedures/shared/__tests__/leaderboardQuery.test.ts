import { describe, expect, it } from 'bun:test';
import { sql, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

import {
  buildLeaderboardOrder,
  buildLeaderboardSearchCondition,
  type LeaderboardOrderColumns,
} from '../leaderboardQuery';

const dialect = new PgDialect();

const columns: LeaderboardOrderColumns = {
  rating: sql.identifier('rating'),
  tournamentsPlayed: sql.identifier('tournamentsPlayed'),
  matchesPlayed: sql.identifier('matchesPlayed'),
  winRate: sql.identifier('winRate'),
  ratingGlobalRank: sql.identifier('ratingGlobalRank'),
  playerId: sql.identifier('playerId'),
};

const renderOrder = (order: SQL[]) =>
  order.map((part) => dialect.sqlToQuery(part).sql);

describe('buildLeaderboardOrder', () => {
  it('keeps global rank order without a sort or direction', () => {
    expect(
      renderOrder(buildLeaderboardOrder(columns, undefined, undefined))
    ).toEqual(['"ratingGlobalRank" asc', '"playerId" asc']);
  });

  it('sorts by rating, highest first, when only a key is sent', () => {
    expect(
      renderOrder(buildLeaderboardOrder(columns, 'rating', undefined))
    ).toEqual(['"rating" desc', '"ratingGlobalRank" asc', '"playerId" asc']);
  });

  it('reverses the whole ranking for the lowest rating first', () => {
    expect(
      renderOrder(buildLeaderboardOrder(columns, 'rating', false))
    ).toEqual(['"rating" asc', '"ratingGlobalRank" desc', '"playerId" desc']);
  });

  it('treats a direction without a key as a rating sort', () => {
    expect(
      renderOrder(buildLeaderboardOrder(columns, undefined, false))
    ).toEqual(['"rating" asc', '"ratingGlobalRank" desc', '"playerId" desc']);
  });

  it.each([
    ['tournaments', '"tournamentsPlayed"'],
    ['matches', '"matchesPlayed"'],
    ['winRate', '"winRate"'],
  ] as const)(
    'sorts by %s and breaks ties by global rank, best first',
    (sort, column) => {
      expect(renderOrder(buildLeaderboardOrder(columns, sort, true))).toEqual([
        `${column} desc`,
        '"ratingGlobalRank" asc',
        '"playerId" asc',
      ]);
      expect(renderOrder(buildLeaderboardOrder(columns, sort, false))).toEqual([
        `${column} asc`,
        '"ratingGlobalRank" asc',
        '"playerId" asc',
      ]);
    }
  );
});

describe('buildLeaderboardSearchCondition', () => {
  it('adds no condition without a term', () => {
    expect(buildLeaderboardSearchCondition(undefined)).toBeUndefined();
    expect(buildLeaderboardSearchCondition('   ')).toBeUndefined();
  });

  it('matches the username anywhere, ignoring case', () => {
    const { sql: text, params } = dialect.sqlToQuery(
      buildLeaderboardSearchCondition('  Stage ')!
    );

    expect(text).toBe('"players"."username" ilike $1');
    expect(params).toEqual(['%Stage%']);
  });

  it('escapes LIKE wildcards in the term', () => {
    const condition = buildLeaderboardSearchCondition('a_b%c\\d');

    expect(dialect.sqlToQuery(condition!).params).toEqual(['%a\\_b\\%c\\\\d%']);
  });
});

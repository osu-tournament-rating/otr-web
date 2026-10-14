import { describe, expect, test } from 'bun:test';

import {
  beatmapListFilterSchema,
  leaderboardFilterSchema,
  tournamentListFilterSchema,
} from '../validation-schema';

describe('beatmapListFilterSchema', () => {
  test('parses valid params', () => {
    const filter = beatmapListFilterSchema.parse({
      page: '2',
      q: 'freedom dive',
      minSr: '5.5',
      maxSr: '7',
      sort: 'sr',
      descending: 'false',
    });

    expect(filter.page).toBe(2);
    expect(filter.q).toBe('freedom dive');
    expect(filter.minSr).toBe(5.5);
    expect(filter.maxSr).toBe(7);
    expect(filter.sort).toBe('sr');
    expect(filter.descending).toBe(false);
  });

  test('discards malformed numeric params instead of throwing', () => {
    const filter = beatmapListFilterSchema.parse({
      page: '0',
      minSr: 'abc',
      maxSr: '20',
      minBpm: '-5',
      ruleset: '99',
      minGameCount: '1.5',
    });

    expect(filter.page).toBeUndefined();
    expect(filter.minSr).toBeUndefined();
    expect(filter.maxSr).toBeUndefined();
    expect(filter.minBpm).toBeUndefined();
    expect(filter.ruleset).toBeUndefined();
    expect(filter.minGameCount).toBeUndefined();
  });

  test('discards out-of-range AR and OD without dropping sibling filters', () => {
    // AR/OD cap at 10; an older ?maxAr=11 link must still render the rest.
    const filter = beatmapListFilterSchema.parse({
      maxAr: '11',
      maxOd: '11',
      minSr: '5',
    });

    expect(filter.maxAr).toBeUndefined();
    expect(filter.maxOd).toBeUndefined();
    expect(filter.minSr).toBe(5);
    expect(filter.maxCs).toBeUndefined();
  });

  test('discards an over-long search term without dropping sibling filters', () => {
    // The oRPC request schema caps searchQuery at 200 characters.
    const filter = beatmapListFilterSchema.parse({
      q: 'a'.repeat(201),
      minSr: '5',
    });

    expect(filter.q).toBe('');
    expect(filter.minSr).toBe(5);
    expect(beatmapListFilterSchema.parse({ q: 'a'.repeat(200) }).q).toBe(
      'a'.repeat(200)
    );
  });

  test('discards repeated params that arrive as arrays', () => {
    const filter = beatmapListFilterSchema.parse({
      minSr: ['1', '2'],
      sort: ['sr', 'bpm'],
    });

    expect(filter.minSr).toBeUndefined();
    expect(filter.sort).toBe('gameCount');
  });

  test('falls back to defaults for unknown sort and descending', () => {
    const filter = beatmapListFilterSchema.parse({
      sort: 'nonsense',
      descending: 'maybe',
    });

    expect(filter.sort).toBe('gameCount');
    expect(filter.descending).toBe(true);
  });

  test('parses an empty query object', () => {
    const filter = beatmapListFilterSchema.parse({});

    expect(filter.q).toBe('');
    expect(filter.sort).toBe('gameCount');
    expect(filter.descending).toBe(true);
    expect(filter.page).toBeUndefined();
  });
});

describe('tournamentListFilterSchema', () => {
  test('drops a maximum rank at the slider ceiling', () => {
    expect(
      tournamentListFilterSchema.parse({ maxRankRange: '1000000' }).maxRankRange
    ).toBeUndefined();
    expect(tournamentListFilterSchema.parse({}).maxRankRange).toBeUndefined();
  });

  test('keeps a maximum rank below the slider ceiling', () => {
    expect(
      tournamentListFilterSchema.parse({ maxRankRange: '250000' }).maxRankRange
    ).toBe(250_000);
  });

  test('discards malformed params without dropping sibling filters', () => {
    const filter = tournamentListFilterSchema.parse({
      ruleset: '99',
      dateMin: 'not-a-date',
      dateMax: 'tomorrow',
      verificationStatus: 'abc',
      rejectionReason: 'abc',
      submittedBy: '1.5',
      lobbySize: '9',
      minRankRange: '0',
      searchQuery: 'owc',
    });

    expect(filter.ruleset).toBeUndefined();
    expect(filter.dateMin).toBeUndefined();
    expect(filter.dateMax).toBeUndefined();
    expect(filter.verificationStatus).toBeUndefined();
    expect(filter.rejectionReason).toBeUndefined();
    expect(filter.submittedBy).toBeUndefined();
    expect(filter.lobbySize).toBeUndefined();
    expect(filter.minRankRange).toBeUndefined();
    expect(filter.searchQuery).toBe('owc');
  });

  test('parses repeated team sizes', () => {
    expect(
      tournamentListFilterSchema.parse({ lobbySize: ['1', '2'] }).lobbySize
    ).toEqual([1, 2]);
  });
});

describe('leaderboardFilterSchema', () => {
  test('parses valid params', () => {
    const filter = leaderboardFilterSchema.parse({
      page: '2',
      country: 'US',
      minRating: '1200',
      maxWinRate: '75.5',
      tiers: 'gold',
      friend: 'true',
    });

    expect(filter.page).toBe(2);
    expect(filter.country).toBe('US');
    expect(filter.minRating).toBe(1200);
    expect(filter.maxWinRate).toBe(75.5);
    expect(filter.tiers).toEqual(['gold']);
    expect(filter.friend).toBe(true);
  });

  test('discards malformed params without dropping sibling filters', () => {
    const filter = leaderboardFilterSchema.parse({
      page: '0',
      country: 'X',
      ruleset: '99',
      minOsuRank: 'abc',
      minRating: '50',
      maxRating: '4000',
      minWinRate: '-1',
      tiers: ['gold', 'nope'],
      maxMatches: '20',
    });

    expect(filter.page).toBeUndefined();
    expect(filter.country).toBeUndefined();
    expect(filter.ruleset).toBeUndefined();
    expect(filter.minOsuRank).toBeUndefined();
    expect(filter.minRating).toBeUndefined();
    expect(filter.maxRating).toBeUndefined();
    expect(filter.minWinRate).toBeUndefined();
    expect(filter.tiers).toBeUndefined();
    expect(filter.maxMatches).toBe(20);
  });

  test('reads friend=false as false', () => {
    expect(leaderboardFilterSchema.parse({ friend: 'false' }).friend).toBe(
      false
    );
    expect(
      leaderboardFilterSchema.parse({ friend: 'maybe' }).friend
    ).toBeUndefined();
    expect(leaderboardFilterSchema.parse({}).friend).toBeUndefined();
  });
});

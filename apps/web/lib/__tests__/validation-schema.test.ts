import { describe, expect, test } from 'bun:test';

import {
  beatmapListFilterSchema,
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
});

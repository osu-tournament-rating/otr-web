import { describe, expect, test } from 'bun:test';

import { Ruleset } from '@otr/core/osu';

import {
  beatmapListFilterSchema,
  leaderboardFilterSchema,
  tournamentEditFormSchema,
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
    expect(filter.ruleset).toBeUndefined();
    expect(filter.rulesets).toBeUndefined();
  });

  test('reads one ruleset as both the single and the list value', () => {
    const filter = beatmapListFilterSchema.parse({ ruleset: '4' });

    expect(filter.ruleset).toBe(Ruleset.Mania4k);
    expect(filter.rulesets).toEqual([Ruleset.Mania4k]);
  });

  test('reads repeated rulesets and keeps valid ones in enum order', () => {
    const filter = beatmapListFilterSchema.parse({
      ruleset: ['5', 'x', '0', '0', '99'],
      minSr: '5',
    });

    expect(filter.ruleset).toBeUndefined();
    expect(filter.rulesets).toEqual([Ruleset.Osu, Ruleset.Mania7k]);
    expect(filter.minSr).toBe(5);
  });
});

describe.each([
  ['beatmapListFilterSchema', beatmapListFilterSchema],
  ['tournamentListFilterSchema', tournamentListFilterSchema],
] as const)('%s rulesets', (_, schema) => {
  test('merges the ruleset and rulesets params', () => {
    const filter = schema.parse({ ruleset: '2', rulesets: ['1', '2'] });

    expect(filter.ruleset).toBeUndefined();
    expect(filter.rulesets).toEqual([Ruleset.Taiko, Ruleset.Catch]);
  });

  test('accepts numbers from a form as well as URL strings', () => {
    const filter = schema.parse({ ruleset: 1 });

    expect(filter.ruleset).toBe(Ruleset.Taiko);
    expect(filter.rulesets).toEqual([Ruleset.Taiko]);
  });

  test('ignores empty and unknown values', () => {
    const filter = schema.parse({ ruleset: ['', '6'], rulesets: '-1' });

    expect(filter.ruleset).toBeUndefined();
    expect(filter.rulesets).toBeUndefined();
  });
});

describe('tournamentEditFormSchema messages', () => {
  const tournament = {
    name: 'Test Tournament',
    abbreviation: 'TT',
    forumUrl: 'https://osu.ppy.sh/community/forums/topics/1',
    rankRangeLowerBound: '1',
    lobbySize: '2',
    ruleset: '0',
    verificationStatus: '4',
    rejectionReason: '0',
  };

  const messagesFor = (patch: Record<string, unknown>, path: string) =>
    tournamentEditFormSchema
      .safeParse({ ...tournament, ...patch })
      .error?.issues.filter((issue) => issue.path.join('.') === path)
      .map((issue) => issue.message) ?? [];

  test('accepts a valid tournament', () => {
    expect(tournamentEditFormSchema.safeParse(tournament).success).toBe(true);
  });

  test('names the forum post URL, with one message per failure', () => {
    const prefixMessage =
      'Forum post URL must be from "https://osu.ppy.sh/community/forums/topics/" or "https://osu.ppy.sh/wiki/en/Tournaments/"';

    expect(messagesFor({ forumUrl: '' }, 'forumUrl')).toEqual([
      'Forum post URL is required',
    ]);
    expect(messagesFor({ forumUrl: 'not a url' }, 'forumUrl')).toEqual([
      prefixMessage,
    ]);
    expect(
      messagesFor({ forumUrl: 'https://example.com/topic/1' }, 'forumUrl')
    ).toEqual([prefixMessage]);
  });

  test('states each field rule', () => {
    expect(messagesFor({ name: '' }, 'name')).toEqual([
      'Tournament name is required',
    ]);
    expect(messagesFor({ abbreviation: '' }, 'abbreviation')).toEqual([
      'Tournament abbreviation is required',
    ]);
    expect(
      messagesFor({ rankRangeLowerBound: '0' }, 'rankRangeLowerBound')
    ).toEqual(['Rank restriction must be at least 1']);
    expect(messagesFor({ lobbySize: '9' }, 'lobbySize')).toEqual([
      'Lobby size cannot exceed 8',
    ]);
  });

  test('still accepts a fractional rank restriction, as before', () => {
    expect(
      tournamentEditFormSchema.safeParse({
        ...tournament,
        rankRangeLowerBound: '1000.5',
      }).success
    ).toBe(true);
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

  test('includes the whole "through" day', () => {
    const filter = tournamentListFilterSchema.parse({
      dateMin: '2025-01-01',
      dateMax: '2025-01-15',
    });

    expect(filter.dateMin?.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(filter.dateMax?.toISOString()).toBe('2025-01-15T23:59:59.999Z');
  });

  test('reads the kit search key q when searchQuery is absent', () => {
    expect(tournamentListFilterSchema.parse({ q: 'owc' }).searchQuery).toBe(
      'owc'
    );
    expect(
      tournamentListFilterSchema.parse({ q: 'owc', searchQuery: 'cwc' })
        .searchQuery
    ).toBe('cwc');
    expect(tournamentListFilterSchema.parse({}).searchQuery).toBe('');
    expect('q' in tournamentListFilterSchema.parse({ q: 'owc' })).toBe(false);
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

  test('reads the player search and sort', () => {
    const filter = leaderboardFilterSchema.parse({
      q: ' stage ',
      sort: 'matches',
      dir: 'asc',
    });

    expect(filter.q).toBe('stage');
    expect(filter.sort).toBe('matches');
    expect(filter.dir).toBe('asc');
  });

  test('drops a search that is too short and an unknown sort', () => {
    const filter = leaderboardFilterSchema.parse({
      q: 'a',
      sort: 'country',
      dir: 'up',
      minMatches: '5',
    });

    expect(filter.q).toBeUndefined();
    expect(filter.sort).toBeUndefined();
    expect(filter.dir).toBeUndefined();
    expect(filter.minMatches).toBe(5);
  });
});

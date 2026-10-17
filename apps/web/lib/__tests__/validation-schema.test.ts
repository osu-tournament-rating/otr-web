import { describe, expect, test } from 'bun:test';

import { tournamentEditFormSchema } from '../validation-schema';

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

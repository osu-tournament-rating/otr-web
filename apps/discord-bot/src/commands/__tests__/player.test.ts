import { describe, expect, test } from 'bun:test';

import { fakeApi, procedure } from '../../__tests__/fake-api';
import {
  ctx,
  playerBeatmaps,
  playerStats,
  playerTournaments,
  siteUrl,
} from '../../__tests__/fixtures';
import { player } from '../player';
import { resolvePlayerKey, type PlayerKey } from '../player-key';

const options = (values: Record<string, string | number>) => ({
  string: (name: string) =>
    typeof values[name] === 'string' ? (values[name] as string) : null,
  integer: (name: string) =>
    typeof values[name] === 'number' ? (values[name] as number) : null,
});

describe('resolvePlayerKey', () => {
  test.each<[string, PlayerKey]>([
    ['Stage', { id: 'Stage', keyType: 'username' }],
    ['  Stage ', { id: 'Stage', keyType: 'username' }],
    ['4504101', { id: 4504101, keyType: 'osu' }],
    ['https://osu.ppy.sh/users/4504101', { id: 4504101, keyType: 'osu' }],
    ['https://osu.ppy.sh/users/4504101/osu', { id: 4504101, keyType: 'osu' }],
    ['https://osu.ppy.sh/u/Stage', { id: 'Stage', keyType: 'username' }],
    [
      'https://osu.ppy.sh/users/Sta%20ge',
      { id: 'Sta ge', keyType: 'username' },
    ],
    [`${siteUrl}/players/1`, { id: 1, keyType: 'otr' }],
  ])('%s', (input, expected) => {
    expect(resolvePlayerKey(input)).toEqual(expected);
  });
});

describe('/player', () => {
  test('looks a username up exactly and renders the card', async () => {
    const stats = procedure(playerStats);
    const reply = await player.execute({
      options: options({ name: 'Stage' }),
      api: fakeApi({ players: { stats } }),
      ctx,
    });
    expect(stats).toHaveBeenCalledWith({
      id: 'Stage',
      keyType: 'username',
      ruleset: undefined,
    });
    expect(reply.embeds[0]).toMatchObject({
      color: 0xaf57db,
      url: `${siteUrl}/players/1`,
      thumbnail: { url: 'https://a.ppy.sh/8000001' },
      image: { url: 'attachment://rating.png' },
    });
    expect(reply.embeds[0].footer?.text).toStartWith('o!TR · osu!');
    expect(reply.files?.map((f) => f.name)).toEqual(['tier.png', 'rating.png']);
  });

  test('passes the ruleset choice and an osu! id', async () => {
    const stats = procedure(playerStats);
    await player.execute({
      options: options({ name: '4504101', ruleset: 1 }),
      api: fakeApi({ players: { stats } }),
      ctx,
    });
    expect(stats).toHaveBeenCalledWith({
      id: 4504101,
      keyType: 'osu',
      ruleset: 1,
    });
  });

  test('the tournaments page fetches stats and tournaments by o!TR id', async () => {
    const stats = procedure(playerStats);
    const tournaments = procedure(playerTournaments);
    const reply = await player.pages!.pt({
      id: { view: 'pt', key: '1', ruleset: 0, page: 1 },
      api: fakeApi({ players: { stats, tournaments } }),
      ctx,
    });
    expect(stats).toHaveBeenCalledWith({ id: 1, keyType: 'otr', ruleset: 0 });
    expect(tournaments).toHaveBeenCalledWith({
      id: 1,
      keyType: 'otr',
      ruleset: 0,
    });
    expect(reply.embeds[0].description).toContain('CO25');
  });

  test('the pooled maps page offsets by page', async () => {
    const stats = procedure(playerStats);
    const beatmaps = procedure(playerBeatmaps);
    await player.pages!.pb({
      id: { view: 'pb', key: '1', ruleset: 0, page: 2 },
      api: fakeApi({ players: { stats, beatmaps } }),
      ctx,
    });
    expect(beatmaps).toHaveBeenCalledTimes(1);
    expect(beatmaps).toHaveBeenCalledWith({
      id: 1,
      keyType: 'otr',
      limit: 5,
      offset: 5,
    });
  });

  test('a page past the end refetches the last page', async () => {
    const stats = procedure(playerStats);
    const beatmaps = procedure({ ...playerBeatmaps, beatmaps: [] });
    const reply = await player.pages!.pb({
      id: { view: 'pb', key: '1', ruleset: 0, page: 15 },
      api: fakeApi({ players: { stats, beatmaps } }),
      ctx,
    });
    expect(beatmaps.mock.calls.map(([input]) => input)).toEqual([
      { id: 1, keyType: 'otr', limit: 5, offset: 70 },
      { id: 1, keyType: 'otr', limit: 5, offset: 5 },
    ]);
    expect(reply.embeds[0].footer?.text).toEndWith('page 2 of 2');
  });

  test('the name option is capped at 100 characters', () => {
    expect(player.data.options?.[0]).toMatchObject({
      name: 'name',
      max_length: 100,
    });
  });
});

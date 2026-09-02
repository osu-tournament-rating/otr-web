import { describe, expect, test } from 'bun:test';

import { fakeApi, procedure } from '../../__tests__/fake-api';
import {
  beatmapList,
  beatmapStats,
  ctx,
  siteUrl,
} from '../../__tests__/fixtures';
import { ReplyError } from '../../command';
import { beatmap, resolveBeatmapId } from '../beatmap';

const options = (query: string) => ({
  string: () => query,
  integer: () => null,
});

describe('resolveBeatmapId', () => {
  test.each([
    '658127',
    'https://osu.ppy.sh/b/658127',
    'https://osu.ppy.sh/beatmaps/658127',
    'https://osu.ppy.sh/beatmapsets/292301#osu/658127',
    `${siteUrl}/beatmaps/658127`,
  ])('%s', (input) => {
    expect(resolveBeatmapId(input)).toBe(658127);
  });

  test('free text is not an id', () => {
    expect(resolveBeatmapId('blue zenith')).toBeNull();
    expect(
      resolveBeatmapId('https://osu.ppy.sh/beatmapsets/292301')
    ).toBeNull();
  });
});

describe('/beatmap', () => {
  test('a link fetches stats by osu! id', async () => {
    const stats = procedure(beatmapStats);
    const list = procedure(beatmapList);
    const reply = await beatmap.execute({
      options: options('https://osu.ppy.sh/b/658127'),
      api: fakeApi({ beatmaps: { stats, list } }),
      ctx,
    });
    expect(list).not.toHaveBeenCalled();
    expect(stats).toHaveBeenCalledWith({ id: 658127, keyType: 'osu' });
    expect(reply.embeds[0]).toMatchObject({
      title: 'xi - Blue Zenith [FOUR DIMENSIONS]',
      url: `${siteUrl}/beatmaps/658127`,
      image: {
        url: 'https://assets.ppy.sh/beatmaps/292301/covers/cover@2x.jpg',
      },
    });
  });

  test('free text opens the first search hit', async () => {
    const stats = procedure(beatmapStats);
    const list = procedure(beatmapList);
    await beatmap.execute({
      options: options('blue zenith'),
      api: fakeApi({ beatmaps: { stats, list } }),
      ctx,
    });
    expect(list.mock.calls[0][0]).toEqual({
      searchQuery: 'blue zenith',
      page: 1,
      pageSize: 1,
    });
    expect(stats).toHaveBeenCalledWith({ id: 658127, keyType: 'osu' });
  });

  test('no hit raises the not-found copy', async () => {
    const list = procedure({ ...beatmapList, items: [] });
    await expect(
      beatmap.execute({
        options: options('zzz'),
        api: fakeApi({ beatmaps: { list } }),
        ctx,
      })
    ).rejects.toThrow(new ReplyError('No beatmap matches "zzz".'));
  });

  test('autocomplete formats artist, title, difficulty, and stars', async () => {
    const list = procedure(beatmapList);
    const choices = await beatmap.autocomplete!({
      name: 'query',
      value: 'zenith',
      api: fakeApi({ beatmaps: { list } }),
    });
    expect(list.mock.calls[0][0]).toEqual({
      searchQuery: 'zenith',
      page: 1,
      pageSize: 25,
    });
    expect(choices[0]).toEqual({
      name: 'xi - Blue Zenith [FOUR DIMENSIONS] ★7.04',
      value: '658127',
    });
  });
});

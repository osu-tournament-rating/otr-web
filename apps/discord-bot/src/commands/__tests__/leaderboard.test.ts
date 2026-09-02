import { describe, expect, test } from 'bun:test';

import { fakeApi, procedure } from '../../__tests__/fake-api';
import { ctx, leaderboard as page } from '../../__tests__/fixtures';
import { leaderboard } from '../leaderboard';

const options = (values: Record<string, string | number>) => ({
  string: (name: string) =>
    typeof values[name] === 'string' ? (values[name] as string) : null,
  integer: (name: string) =>
    typeof values[name] === 'number' ? (values[name] as number) : null,
});

describe('/leaderboard', () => {
  test('passes ruleset, country, and page with 20 per page', async () => {
    const list = procedure(page);
    const reply = await leaderboard.execute({
      options: options({ ruleset: 1, country: 'kr', page: 3 }),
      api: fakeApi({ leaderboard: { list } }),
      ctx,
    });
    expect(list).toHaveBeenCalledWith({
      ruleset: 1,
      country: 'KR',
      page: 3,
      pageSize: 20,
    });
    expect(reply.embeds[0].title).toBe('osu! leaderboard · page 3 · KR');
    expect(JSON.stringify(reply.components)).toContain('1:lb:-:0:4:KR');
  });

  test('defaults to page 1 with no filters', async () => {
    const list = procedure(page);
    await leaderboard.execute({
      options: options({}),
      api: fakeApi({ leaderboard: { list } }),
      ctx,
    });
    expect(list).toHaveBeenCalledWith({
      ruleset: undefined,
      country: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  test('the page button refetches with the encoded filters', async () => {
    const list = procedure(page);
    await leaderboard.pages!.lb({
      id: { view: 'lb', key: '-', ruleset: 0, page: 4, country: 'KR' },
      api: fakeApi({ leaderboard: { list } }),
      ctx,
    });
    expect(list).toHaveBeenCalledWith({
      ruleset: 0,
      country: 'KR',
      page: 4,
      pageSize: 20,
    });
  });
});

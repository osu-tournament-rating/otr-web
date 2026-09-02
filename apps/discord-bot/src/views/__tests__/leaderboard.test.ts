import { describe, expect, test } from 'bun:test';

import { ctx, leaderboard, siteUrl } from '../../__tests__/fixtures';
import { finalize } from '../../runner';
import { leaderboardPage } from '../leaderboard';

const id = { view: 'lb', key: '-', ruleset: 0, page: 3 };

describe('leaderboard page', () => {
  test('rows show rank, flag, link, rating, tier, matches, and win rate', () => {
    const reply = leaderboardPage(leaderboard, id, ctx);
    const [embed] = reply.embeds;
    expect(embed).toMatchObject({
      color: 0x5a8ff0,
      title: 'osu! leaderboard · page 3',
      url: `${siteUrl}/leaderboard?page=3&ruleset=0`,
      thumbnail: { url: 'attachment://logo.png' },
      footer: { text: 'o!TR · osu! · 10,287 rated players · page 3 of 515' },
    });
    const rows = embed.description!.split('\n');
    expect(rows).toHaveLength(20);
    expect(rows[0]).toBe(
      `**#41** 🇰🇷 [Cytusine](${siteUrl}/players/10) · **1,742** · Diamond I · 212 m · 58%`
    );
    expect(embed.fields).toBeUndefined();
    expect(reply.files?.[0].name).toBe('logo.png');
  });

  test('the country filter shows country ranks and passes through the buttons', () => {
    const reply = leaderboardPage(leaderboard, { ...id, country: 'KR' }, ctx);
    expect(reply.embeds[0].title).toBe('osu! leaderboard · page 3 · KR');
    expect(reply.embeds[0].url).toBe(
      `${siteUrl}/leaderboard?page=3&ruleset=0&country=KR`
    );
    expect(reply.embeds[0].description!.split('\n')[0]).toStartWith('**#1** ');
    const [previous, next] = reply.components![0].components as {
      custom_id?: string;
    }[];
    expect(previous.custom_id).toBe('1:lb:-:0:2:KR');
    expect(next.custom_id).toBe('1:lb:-:0:4:KR');
  });

  test('page buttons disable at the edges', () => {
    const first = leaderboardPage(
      { ...leaderboard, page: 1 },
      { ...id, page: 1 },
      ctx
    );
    const last = leaderboardPage(
      { ...leaderboard, page: 515 },
      { ...id, page: 515 },
      ctx
    );
    const buttons = (reply: typeof first) =>
      reply.components![0].components as { disabled?: boolean }[];
    expect(buttons(first).map((b) => b.disabled)).toEqual([
      true,
      false,
      undefined,
    ]);
    expect(buttons(last).map((b) => b.disabled)).toEqual([
      false,
      true,
      undefined,
    ]);
  });

  test('an empty page says so and stays within the limits', () => {
    const reply = leaderboardPage(
      { ...leaderboard, leaderboard: [], total: 0, pages: 0, page: 1 },
      id,
      ctx
    );
    expect(reply.embeds[0].description).toBe('No rated players match.');
    expect(() => finalize(reply)).not.toThrow();
  });
});

import { RatingAdjustmentType } from '@otr/core/osu';
import type { APIEmbed } from 'discord.js';

import {
  afterAll,
  beforeAll,
  describe,
  expect,
  setSystemTime,
  test,
} from 'bun:test';

import {
  ctx,
  customIds,
  playerBeatmaps,
  playerStats,
  playerTournaments,
  siteUrl,
} from '../../__tests__/fixtures';
import { finalize } from '../../runner';
import {
  playerBeatmaps as pooledMaps,
  playerCard,
  playerTournaments as tournamentsPage,
} from '../player';

const sections = (embed: APIEmbed) =>
  embed.description?.includes('\n\n**')
    ? embed.description
        .split('\n\n')
        .slice(1)
        .map((section) => {
          const newline = section.indexOf('\n');
          return {
            name: section.slice(2, newline - 2),
            value: section.slice(newline + 1),
          };
        })
    : undefined;

const png = [0x89, 0x50, 0x4e, 0x47];

const many = Array.from({ length: 7 }, (_, i) => ({
  ...playerTournaments[0],
  id: 600 + i,
  abbreviation: `T${i}`,
  endTime: new Date(Date.UTC(2025, 0, 20 - i)).toISOString(),
}));

const card = () => playerCard(playerStats, playerTournaments, ctx).embeds[0];

beforeAll(() => setSystemTime(new Date('2026-03-01T00:00:00Z')));
afterAll(() => setSystemTime());

describe('player card', () => {
  test('heads with the username and the ruleset, and keeps the color, avatar, chart, and footer', () => {
    const embed = card();
    expect(embed).toMatchObject({
      color: 0xaf57db,
      thumbnail: { url: 'https://a.ppy.sh/8000001' },
      image: { url: 'attachment://rating.png' },
      author: { name: 'osu!' },
      title: 'Stage',
      url: `${siteUrl}/players/1`,
      footer: { text: 'o!TR · osu!' },
    });
    expect(embed.author?.icon_url).toBeUndefined();
    expect(embed.title).toBe('Stage');
    expect(embed.url).toBe(`${siteUrl}/players/1`);
  });

  test('the description shows only current tier, rating, and ranks', () => {
    expect(card().description?.split('\n\n')[0]).toBe(
      [
        '<:tier_diamond2:1> **Diamond II** · **1,642 TR**',
        '🌐 **#1,234** (#56 🇺🇸)',
      ].join('\n')
    );
  });

  test('full-width description sections replace the grid', () => {
    const embed = card();
    expect(embed.fields).toBeUndefined();
    expect(sections(embed)?.map((section) => section.name)).toEqual([
      '⚔️ Record',
      '🎲 Mods',
      '🕒 Recent matches',
      '🏆 Last tournament',
    ]);
    expect(embed.description).toContain(
      '↳ **123–89** · 58% won\n↳ **43** tournaments\n↳ peak **1,701 TR**'
    );
    expect(embed.description).toContain(
      '↳ **NM 59%** (400 plays) · median **600K**\n↳ **HD 33%** (220 plays) · median **640K**\n↳ **DT 7%** (50 plays) · median **610K**'
    );
    expect(embed.description).not.toContain('```');
    expect(embed.description).toContain('**[Lost 4–2]');
    expect(embed.description).toContain('Corsace Open 2025');
    const lastMatch = sections(embed)?.find(
      (section) => section.name === '🕒 Recent matches'
    )?.value;
    expect(lastMatch).toContain(
      `[Corsace Open 2025](${siteUrl}/tournaments/512)`
    );
    expect(lastMatch).not.toContain('(CO25)');
  });

  test('a missing emoji renders as empty text, never as a raw tag', () => {
    const description = playerCard(playerStats, playerTournaments, {
      ...ctx,
      emoji: () => '',
    }).embeds[0].description;
    expect(description?.split('\n\n')[0]).toBe(
      ['**Diamond II** · **1,642 TR**', '🌐 **#1,234** (#56 🇺🇸)'].join('\n')
    );
  });

  test('the top tier retains current tier without a progress line', () => {
    const progress = {
      ...playerStats.rating.tierProgress,
      currentTier: 'Elite Grandmaster',
      currentSubTier: null,
      nextTier: null,
      nextSubTier: null,
    };
    const rating = { ...playerStats.rating, tierProgress: progress };
    const [embed] = playerCard(
      { ...playerStats, rating },
      playerTournaments,
      ctx
    ).embeds;
    expect(embed.description?.split('\n\n')[0].split('\n')).toHaveLength(2);
    expect(embed.description).toStartWith(
      '<:tier_elite_grandmaster:1> **Elite Grandmaster**'
    );
  });

  test('fewer than three matches leave the time window empty', () => {
    const rating = {
      ...playerStats.rating,
      adjustments: playerStats.rating.adjustments.slice(0, 3),
      matchesPlayed: 2,
    };
    const [embed] = playerCard(
      { ...playerStats, rating },
      playerTournaments,
      ctx,
      'details'
    ).embeds;
    expect(sections(embed)?.[0].value).toBe('— · **2** matches');
  });

  test('an empty company list reads as a dash', () => {
    const [embed] = playerCard(
      { ...playerStats, frequentTeammates: [], frequentOpponents: [] },
      playerTournaments,
      ctx,
      'details'
    ).embeds;
    expect(sections(embed)?.[1].value).toBe('—');
    expect(sections(embed)?.[2].value).toBe('—');
  });

  test('no mod counts drop the mods field', () => {
    const [embed] = playerCard(
      { ...playerStats, modPerformance: [] },
      playerTournaments,
      ctx
    ).embeds;
    expect(sections(embed)?.map((f) => f.name)).not.toContain('🎲 Mods');
  });

  test('no tournaments drop the last tournament field', () => {
    const [embed] = playerCard(playerStats, [], ctx).embeds;
    const names = sections(embed)?.map((f) => f.name) ?? [];
    expect(names).not.toContain('🏆 Last tournament');
    expect(sections(embed)?.at(-1)?.value).not.toContain('/tournaments/');
  });

  test('the card carries no timestamp', () => {
    expect(card().timestamp).toBeUndefined();
  });

  test('a single tournament and match read in the singular', () => {
    const rating = {
      ...playerStats.rating,
      tournamentsPlayed: 1,
      matchesPlayed: 1,
    };
    const [embed] = playerCard(
      { ...playerStats, rating },
      playerTournaments,
      ctx
    ).embeds;
    expect(sections(embed)?.[0].value).toContain(
      '**1** tournament\n↳ peak **1,701 TR**'
    );
    const details = playerCard({ ...playerStats, rating }, [], ctx, 'details');
    expect(sections(details.embeds[0])?.[0].value).toEndWith('**1** match');
    const page = tournamentsPage(
      playerStats,
      playerTournaments.slice(0, 1),
      { view: 'pt', key: '1', ruleset: 0, page: 1 },
      ctx
    );
    expect(page.embeds[0].footer?.text).toBe(
      'o!TR · osu! · 1 tournament · page 1 of 1'
    );
  });

  test('the chart rasterizes to a PNG file and no tier icon rides along', () => {
    const files = playerCard(playerStats, playerTournaments, ctx).files ?? [];
    expect(files.map((f) => f.name)).toEqual(['rating.png']);
    expect([...files[0].data.subarray(0, 4)]).toEqual(png);
  });

  test('summary and details keep player identity, ruleset, and canonical profile link', () => {
    const summary = playerCard(playerStats, playerTournaments, ctx);
    const details = playerCard(playerStats, [], ctx, 'details');
    expect(summary.components?.[0].components).toEqual([
      { type: 2, style: 2, label: 'More details', custom_id: '1:pd:1:0:1' },
    ]);
    expect(details.components?.[0].components).toHaveLength(1);
    expect(details.embeds[0].url).toBe(`${siteUrl}/players/1`);
    expect(details.components?.[0].components[0]).toMatchObject({
      label: 'Back',
      custom_id: '1:po:1:0:1',
    });
    expect(sections(details.embeds[0])?.map((section) => section.name)).toEqual(
      ['🕑 Match times', '🤝 Often with', '🎯 Often against']
    );
    expect(details.embeds[0].description).toContain('Cytusine (**16**)');
    expect(details.embeds[0].image).toBeUndefined();
    expect(finalize(details).embeds?.[0]).toEqual(details.embeds[0]);
  });

  test('a player without a rating gets a grey card, no fields, no chart, and no buttons', () => {
    const reply = playerCard(
      { ...playerStats, ruleset: 1, rating: null, matchStats: null },
      [],
      ctx
    );
    expect(reply.embeds[0]).toMatchObject({
      color: 0x8c8c8c,
      author: { name: 'osu!taiko' },
      description:
        'No rating in osu!taiko yet. Ratings are separate per ruleset.',
      footer: { text: 'o!TR · osu!taiko' },
    });
    expect(reply.embeds[0].fields).toBeUndefined();
    expect(reply.embeds[0].image).toBeUndefined();
    expect(reply.components).toBeUndefined();
    expect(reply.files).toEqual([]);
  });

  test('a four figure record carries the thousands separator', () => {
    const matchStats = {
      ...playerStats.matchStats,
      matchesWon: 1234,
      matchesLost: 1089,
    };
    const [embed] = playerCard(
      { ...playerStats, matchStats },
      playerTournaments,
      ctx
    ).embeds;
    expect(sections(embed)?.[0].value).toStartWith('↳ **1,234–1,089** ·');
    const page = tournamentsPage(
      { ...playerStats, matchStats },
      playerTournaments,
      { view: 'pt', key: '1', ruleset: 0, page: 1 },
      ctx
    );
    expect(page.embeds[0].description).toContain('**1,234–1,089** matches');
  });

  test('missing match stats read as in progress', () => {
    const [embed] = playerCard(
      { ...playerStats, matchStats: null },
      playerTournaments,
      ctx
    ).embeds;
    expect(sections(embed)?.[0].value).toBe(
      'Stats are still in progress. Check back later.'
    );
  });

  test('the card stays within the limits after finalize', () => {
    expect(() =>
      finalize(playerCard(playerStats, playerTournaments, ctx))
    ).not.toThrow();
  });
});

describe('player tournaments', () => {
  test('the page heads the count, lists entries newest first, and pages', () => {
    const reply = tournamentsPage(
      playerStats,
      playerTournaments,
      { view: 'pt', key: '1', ruleset: 0, page: 1 },
      ctx
    );
    expect(reply.embeds[0]).toMatchObject({
      color: 0xaf57db,
      author: { name: 'osu!' },
      title: 'Stage',
      url: `${siteUrl}/players/1`,
    });
    expect(reply.embeds[0].description).toBe(
      [
        '🏆 **2** tournaments · **123–89** matches · **58%** won',
        `❖ [Corsace Open 2025](${siteUrl}/tournaments/512) (CO25)\n**3–1** · **+166 TR** · 4v4 · #1,000+ · 2025-07-01`,
        `❖ [osu! World Cup 2024](${siteUrl}/tournaments/513) (OWC24)\n**4–1** · **+0 TR** · 4v4 · Open rank · 2025-01-02`,
      ].join('\n\n')
    );
    expect(reply.embeds[0].footer?.text).toBe(
      'o!TR · osu! · 2 tournaments · page 1 of 1'
    );
  });

  test('the second page lists the rest and keeps the pager', () => {
    const reply = tournamentsPage(
      playerStats,
      many,
      { view: 'pt', key: '1', ruleset: 0, page: 2 },
      ctx
    );
    expect(reply.embeds[0].description).toContain(
      `❖ [Corsace Open 2025](${siteUrl}/tournaments/605) (T5)`
    );
    expect(reply.embeds[0].footer?.text).toBe(
      'o!TR · osu! · 7 tournaments · page 2 of 2'
    );
    expect(reply.components).toHaveLength(2);
    const [previous, next] = reply.components![1].components as {
      disabled?: boolean;
      custom_id?: string;
    }[];
    expect(previous).toMatchObject({
      custom_id: '1:pt:1:0:1',
      disabled: false,
    });
    expect(next).toMatchObject({ disabled: true });
  });

  test('an empty list says so', () => {
    const reply = tournamentsPage(
      playerStats,
      [],
      { view: 'pt', key: '1', ruleset: 0, page: 1 },
      ctx
    );
    expect(reply.embeds[0].description).toBe('No tournaments in osu! yet.');
  });

  test('the pooled maps page lists maps with stars, BPM, a link, and pool counts', () => {
    const reply = pooledMaps(
      playerStats,
      playerBeatmaps,
      { view: 'pb', key: '1', ruleset: 0, page: 1 },
      ctx
    );
    expect(reply.embeds[0].description).toContain(
      `6.42★ · 200 BPM · [Camellia - Exit This Earth 0 [Extra]](${siteUrl}/beatmaps/658100) · 3 pools`
    );
    expect(reply.embeds[0].footer?.text).toBe(
      'o!TR · osu! · 7 pooled maps · page 1 of 2'
    );
  });

  test('the paged views give every button a distinct id', () => {
    for (const page of [1, 2]) {
      const tournaments = customIds(
        tournamentsPage(
          playerStats,
          many,
          { view: 'pt', key: '1', ruleset: 0, page },
          ctx
        )
      );
      expect(new Set(tournaments).size).toBe(tournaments.length);
      const maps = customIds(
        pooledMaps(
          playerStats,
          playerBeatmaps,
          { view: 'pb', key: '1', ruleset: 0, page },
          ctx
        )
      );
      expect(new Set(maps).size).toBe(maps.length);
    }
  });
});

test('dense full-width profile remains intact within Discord description limits', () => {
  const company = Array.from({ length: 5 }, (_, i) => ({
    ...playerStats.frequentTeammates[0],
    frequency: 999999,
    player: {
      ...playerStats.frequentTeammates[0].player,
      username: `Player ${i} ${'long name '.repeat(3)}`,
    },
  }));
  const reply = playerCard(
    { ...playerStats, frequentTeammates: company, frequentOpponents: company },
    playerTournaments.map((t) => ({
      ...t,
      name: 'Long tournament name '.repeat(10),
      abbreviation: 'LONG'.repeat(8),
    })),
    { ...ctx, emoji: (name) => `<:${name}:1234567890123456789>` }
  );
  const details = playerCard(
    { ...playerStats, frequentTeammates: company, frequentOpponents: company },
    [],
    ctx,
    'details'
  );
  expect(details.embeds[0].description!.length).toBeLessThanOrEqual(4096);
  expect(finalize(details).embeds?.[0]).toEqual(details.embeds[0]);
  expect(reply.embeds[0].description!.length).toBeLessThanOrEqual(4096);
  expect(reply.embeds[0].fields).toBeUndefined();
  expect(finalize(reply).embeds?.[0]).toEqual(reply.embeds[0]);
});

test('peak TR icon follows the peak tier rather than the current tier', () => {
  const reply = playerCard(
    {
      ...playerStats,
      matchStats: { ...playerStats.matchStats, highestRating: 1900 },
    },
    playerTournaments,
    ctx
  );
  expect(reply.embeds[0].description).toContain(
    'peak **1,900 TR** <:tier_master3:1>'
  );
  const withoutPeak = playerCard(
    {
      ...playerStats,
      matchStats: { ...playerStats.matchStats, highestRating: null },
    },
    playerTournaments,
    { ...ctx, emoji: () => '' }
  );
  expect(withoutPeak.embeds[0].description).toContain('peak **1,642 TR**');
  expect(withoutPeak.embeds[0].description).not.toContain('<:');
});

test('recent matches select three distinct matches newest first from unsorted history', () => {
  const base = playerStats.rating.adjustments.find((a) => a.matchId !== null)!;
  const match = (id: number, day: number) => ({
    ...base,
    adjustmentType: RatingAdjustmentType.Match,
    matchId: id,
    timestamp: `2026-01-${String(day).padStart(2, '0')}T00:00:00Z`,
  });
  const adjustments = [
    match(1, 1),
    match(4, 4),
    match(2, 2),
    match(4, 4),
    match(3, 3),
  ];
  const reply = playerCard(
    { ...playerStats, rating: { ...playerStats.rating, adjustments } },
    playerTournaments,
    ctx
  );
  const text =
    sections(reply.embeds[0])?.find((s) => s.name === '🕒 Recent matches')
      ?.value ?? '';
  expect(
    [...text.matchAll(/\/matches\/(\d+)/g)].map((m) => Number(m[1]))
  ).toEqual([4, 3, 2]);
  expect(finalize(reply).embeds?.[0]).toEqual(reply.embeds[0]);
});

test('recent matches do not invent entries when fewer than three are available', () => {
  const match = playerStats.rating.adjustments.find(
    (a) => a.adjustmentType === RatingAdjustmentType.Match && a.matchId !== null
  )!;
  for (const count of [0, 1, 2]) {
    const adjustments = Array.from({ length: count }, (_, i) => ({
      ...match,
      matchId: 900 + i,
    }));
    const reply = playerCard(
      { ...playerStats, rating: { ...playerStats.rating, adjustments } },
      playerTournaments,
      ctx
    );
    const section = sections(reply.embeds[0])?.find(
      (s) => s.name === '🕒 Recent matches'
    );
    expect([
      ...(section?.value ?? '').matchAll(/\/matches\/(\d+)/g),
    ]).toHaveLength(count);
    if (!count) expect(section).toBeUndefined();
  }
});

test('an older API without eligible mod performance never supplies legacy counts as fallback', () => {
  const stats = { ...playerStats, modPerformance: undefined };
  expect(
    playerCard(stats, playerTournaments, ctx).embeds[0].description
  ).not.toContain('🎲 Mods');
});

test('player mod rows stay text-only when mod emojis exist', () => {
  expect(card().description).not.toContain('<:mod_');
});

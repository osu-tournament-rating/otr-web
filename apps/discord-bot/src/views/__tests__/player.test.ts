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
  test('carries the tier color, the site link, the avatar, the chart, and the footer', () => {
    expect(card()).toMatchObject({
      color: 0xaf57db,
      title: 'Stage',
      url: `${siteUrl}/players/1`,
      thumbnail: { url: 'https://a.ppy.sh/8000001' },
      image: { url: 'attachment://rating.png' },
      author: { name: 'osu! · Diamond II', icon_url: 'attachment://tier.png' },
      footer: { text: 'o!TR · osu!' },
    });
  });

  test('the description reads the tier, the ranks, and the road to the next tier', () => {
    expect(card().description).toBe(
      [
        '<:tier_diamond2:1> **Diamond II** · **1,642 TR**',
        '**#1,234** (#56 🇺🇸)',
        '**58 TR** to `▰▰▰▱▱` <:tier_diamond1:1> Diamond I',
      ].join('\n')
    );
  });

  test('the fields hold the record, the times, the company, the mods, and the last two entries', () => {
    const fields = card().fields ?? [];
    expect(fields.map((f) => f.name)).toEqual([
      '⚔️ Record',
      '🕑 Match times',
      '​',
      '🤝 Often with',
      '🎯 Often against',
      '​',
      '🎲 Mods',
      '🕒 Last match',
      '🏆 Last tournament',
    ]);
    expect(fields.map((f) => f.inline)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(fields[0].value).toBe(
      '**123–89** · 58% won\n**43** tournaments · peak **1,701 TR**'
    );
    expect(fields[1].value).toBe('**13–19 UTC** (87%)\n**212** matches');
    expect(fields[3].value).toBe(
      '**16** - Cytusine\n**14** - Zylice\n**12** - Aireu\n**10** - Kanjiro\n**8** - Rinna'
    );
    expect(fields[6].value).toBe(
      '```\nNM  59%  400  ▰▰▰▰▰▰▰\nHD  33%  220  ▰▰▰▰▱▱▱\nDT   7%   50  ▰▱▱▱▱▱▱\n```'
    );
    expect(fields[7].value).toBe(
      `**[Lost 4–2](${siteUrl}/matches/523)** · **−11 TR** · 2mo ago · [Corsace Open 2025](${siteUrl}/tournaments/512) (CO25)`
    );
    expect(fields[8].value).toBe(
      `**3–1** · **+166 TR** · 4v4 · #1,000+ · 2025-07-01 · [Corsace Open 2025](${siteUrl}/tournaments/512) (CO25)`
    );
  });

  test('a missing emoji renders as empty text, never as a raw tag', () => {
    const description = playerCard(playerStats, playerTournaments, {
      ...ctx,
      emoji: () => '',
    }).embeds[0].description;
    expect(description).toBe(
      [
        '**Diamond II** · **1,642 TR**',
        '**#1,234** (#56 🇺🇸)',
        '**58 TR** to `▰▰▰▱▱` Diamond I',
      ].join('\n')
    );
  });

  test('the top tier shows a full bar and no target', () => {
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
    expect(embed.description).toContain('`▰▰▰▰▰` Top tier');
    expect(embed.description).toStartWith(
      '<:tier_elite_grandmaster:1> **Elite Grandmaster**'
    );
  });

  test('a jump into a new major tier reads its lowest subtier', () => {
    const progress = {
      ...playerStats.rating.tierProgress,
      nextTier: 'Master',
      nextSubTier: null,
      ratingForNextTier: 1900,
      majorTierFillPercentage: 0.14,
    };
    const rating = { ...playerStats.rating, tierProgress: progress };
    const [embed] = playerCard(
      { ...playerStats, rating },
      playerTournaments,
      ctx
    ).embeds;
    expect(embed.description).toContain(
      '**258 TR** to `▰▱▱▱▱` <:tier_master3:1> Master III'
    );
  });

  test('elite grandmaster as the next tier carries no numeral', () => {
    const progress = {
      ...playerStats.rating.tierProgress,
      nextTier: 'Elite Grandmaster',
      nextSubTier: null,
      ratingForNextTier: 2500,
      majorTierFillPercentage: 0.5,
    };
    const rating = { ...playerStats.rating, tierProgress: progress };
    const [embed] = playerCard(
      { ...playerStats, rating },
      playerTournaments,
      ctx
    ).embeds;
    expect(embed.description).toEndWith(
      '**858 TR** to `▰▰▰▱▱` <:tier_elite_grandmaster:1> Elite Grandmaster'
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
      ctx
    ).embeds;
    expect(embed.fields?.[1].value).toBe('—\n**2** matches');
  });

  test('an empty company list reads as a dash', () => {
    const [embed] = playerCard(
      { ...playerStats, frequentTeammates: [], frequentOpponents: [] },
      playerTournaments,
      ctx
    ).embeds;
    expect(embed.fields?.[3].value).toBe('—');
    expect(embed.fields?.[4].value).toBe('—');
  });

  test('no mod counts drop the mods field', () => {
    const [embed] = playerCard(
      { ...playerStats, modStats: [] },
      playerTournaments,
      ctx
    ).embeds;
    expect(embed.fields?.map((f) => f.name)).not.toContain('🎲 Mods');
  });

  test('no tournaments drop the last tournament field', () => {
    const [embed] = playerCard(playerStats, [], ctx).embeds;
    const names = embed.fields?.map((f) => f.name) ?? [];
    expect(names).not.toContain('🏆 Last tournament');
    expect(embed.fields?.at(-1)?.value).not.toContain('/tournaments/');
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
    expect(embed.fields?.[0].value).toEndWith(
      '**1** tournament · peak **1,701 TR**'
    );
    expect(embed.fields?.[1].value).toEndWith('**1** match');
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

  test('the tier icon and the chart rasterize to PNG files', () => {
    const files = playerCard(playerStats, playerTournaments, ctx).files ?? [];
    expect(files.map((f) => f.name)).toEqual(['tier.png', 'rating.png']);
    for (const file of files) {
      expect([...file.data.subarray(0, 4)]).toEqual(png);
    }
  });

  test('buttons link the overview, the pages, and the site', () => {
    const [row] =
      playerCard(playerStats, playerTournaments, ctx).components ?? [];
    expect(JSON.stringify(row)).toContain('"custom_id":"1:pt:1:0:1"');
    expect(JSON.stringify(row)).toContain('"custom_id":"1:pb:1:0:1"');
    expect(JSON.stringify(row)).toContain(`"url":"${siteUrl}/players/1"`);
  });

  test('a player without a rating gets a grey card, no fields, no chart, and the buttons', () => {
    const reply = playerCard(
      { ...playerStats, ruleset: 1, rating: null, matchStats: null },
      [],
      ctx
    );
    expect(reply.embeds[0]).toMatchObject({
      color: 0x8c8c8c,
      description:
        'No rating in osu!taiko yet. Ratings are separate per ruleset.',
      footer: { text: 'o!TR · osu!taiko' },
    });
    expect(reply.embeds[0].fields).toBeUndefined();
    expect(reply.embeds[0].image).toBeUndefined();
    expect(reply.components).toHaveLength(1);
    expect(reply.files).toEqual([]);
  });

  test('missing match stats read as in progress', () => {
    const [embed] = playerCard(
      { ...playerStats, matchStats: null },
      playerTournaments,
      ctx
    ).embeds;
    expect(embed.fields?.[0].value).toBe(
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
    expect(reply.embeds[0]).toMatchObject({ color: 0xaf57db, title: 'Stage' });
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
      `★6.42 · 200 BPM · [Camellia - Exit This Earth 0 [Extra]](${siteUrl}/beatmaps/658100) · 3 pools`
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

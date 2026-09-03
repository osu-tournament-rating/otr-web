import { describe, expect, test } from 'bun:test';

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
}));

describe('player card', () => {
  test('carries the tier color, the site link, the avatar, the chart, and the footer', () => {
    const [embed] = playerCard(playerStats, ctx).embeds;
    expect(embed).toMatchObject({
      color: 0xaf57db,
      title: 'Stage',
      url: `${siteUrl}/players/1`,
      thumbnail: { url: 'https://a.ppy.sh/8000001' },
      image: { url: 'attachment://rating.png' },
      author: { name: 'osu! · Diamond II', icon_url: 'attachment://tier.png' },
    });
    expect(embed.description).toContain(
      '**1,642 TR** · top 4.2% · 🇺🇸 United States'
    );
    expect(embed.description).toContain('`▰▰▰▰▰▰▱▱▱▱` 58 TR to Diamond I');
    expect(embed.description).toContain('Last match <t:');
    expect(embed.description).not.toContain('Provisional');
    expect(embed.fields?.map((f) => f.name)).toEqual([
      'Rank',
      'Record',
      'Peak',
      'Often with',
      'Often against',
    ]);
    expect(embed.fields?.[0].value).toBe('#1,234 global\n#56 US');
    expect(embed.fields?.[2].value).toBe('1,701 TR\n+312 lifetime');
    expect(embed.fields?.[3].value).toBe('Cytusine 14 · Zylice 12 · Aireu 10');
    expect(embed.footer?.text).toBe(
      'o!TR · osu! · TR estimates relative tournament performance, not skill'
    );
  });

  test('the card carries no timestamp', () => {
    expect(playerCard(playerStats, ctx).embeds[0].timestamp).toBeUndefined();
  });

  test('the bar and the text describe the same target', () => {
    const progress = {
      ...playerStats.rating.tierProgress,
      nextTier: 'Master',
      nextSubTier: null,
      ratingForNextTier: 1900,
      majorTierFillPercentage: 0.14,
    };
    const rating = { ...playerStats.rating, tierProgress: progress };
    const [embed] = playerCard({ ...playerStats, rating }, ctx).embeds;
    expect(embed.description).toContain('`▰▱▱▱▱▱▱▱▱▱` 258 TR to Master');
  });

  test('rank 1 reads #1 and the top share floors at 0.1%', () => {
    const first = { ...playerStats.rating, globalRank: 1, percentile: 100 };
    expect(
      playerCard({ ...playerStats, rating: first }, ctx).embeds[0].description
    ).toContain('**1,642 TR** · #1 ·');
    const second = { ...playerStats.rating, globalRank: 2, percentile: 99.995 };
    expect(
      playerCard({ ...playerStats, rating: second }, ctx).embeds[0].description
    ).toContain('· top 0.1% ·');
  });

  test('a single tournament and match read in the singular', () => {
    const rating = {
      ...playerStats.rating,
      tournamentsPlayed: 1,
      matchesPlayed: 1,
    };
    const [embed] = playerCard({ ...playerStats, rating }, ctx).embeds;
    expect(embed.fields?.[1].value).toStartWith('1 tournament\n1 match ·');
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
    const files = playerCard(playerStats, ctx).files ?? [];
    expect(files.map((f) => f.name)).toEqual(['tier.png', 'rating.png']);
    for (const file of files) {
      expect([...file.data.subarray(0, 4)]).toEqual(png);
    }
  });

  test('buttons link the overview, the pages, and the site', () => {
    const [row] = playerCard(playerStats, ctx).components ?? [];
    expect(JSON.stringify(row)).toContain('"custom_id":"1:pt:1:0:1"');
    expect(JSON.stringify(row)).toContain('"custom_id":"1:pb:1:0:1"');
    expect(JSON.stringify(row)).toContain(`"url":"${siteUrl}/players/1"`);
  });

  test('a player without a rating gets a grey card, no fields, no chart, and the buttons', () => {
    const reply = playerCard(
      { ...playerStats, ruleset: 1, rating: null, matchStats: null },
      ctx
    );
    expect(reply.embeds[0]).toMatchObject({
      color: 0x8c8c8c,
      description:
        'No rating in osu!taiko yet. Ratings are separate per ruleset.',
    });
    expect(reply.embeds[0].fields).toBeUndefined();
    expect(reply.embeds[0].image).toBeUndefined();
    expect(reply.components).toHaveLength(1);
    expect(reply.files).toEqual([]);
  });

  test('a provisional rating keeps the tier color and says so', () => {
    const rating = {
      ...playerStats.rating,
      adjustments: playerStats.rating.adjustments.slice(0, 7),
      isProvisional: true,
    };
    const [embed] = playerCard({ ...playerStats, rating }, ctx).embeds;
    expect(embed.color).toBe(0xaf57db);
    expect(embed.description).toContain('Provisional (7 of 10 adjustments)');
  });

  test('missing match stats read as in progress', () => {
    const [embed] = playerCard(
      { ...playerStats, matchStats: null },
      ctx
    ).embeds;
    expect(embed.fields?.[1].value).toBe(
      'Stats are still in progress. Check back later.'
    );
    expect(embed.fields?.[2].value).toBe(
      'Stats are still in progress. Check back later.'
    );
  });

  test('the card stays within the limits after finalize', () => {
    expect(() => finalize(playerCard(playerStats, ctx))).not.toThrow();
  });

  test('the tournaments page keeps the header, lists five per page, and pages', () => {
    const reply = tournamentsPage(
      playerStats,
      many,
      { view: 'pt', key: '1', ruleset: 0, page: 2 },
      ctx
    );
    expect(reply.embeds[0]).toMatchObject({ color: 0xaf57db, title: 'Stage' });
    expect(reply.embeds[0].description?.split('\n')).toHaveLength(2);
    expect(reply.embeds[0].description).toContain(
      `[T5](${siteUrl}/tournaments/605) Corsace Open 2025 · 4v4 · 3–1 · <t:`
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

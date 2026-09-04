import { describe, expect, test } from 'bun:test';

import {
  beatmapStats,
  ctx,
  customIds,
  siteUrl,
} from '../../__tests__/fixtures';
import { finalize } from '../../runner';
import { beatmapCard, beatmapScores, beatmapTournaments } from '../beatmap';

const many = {
  ...beatmapStats,
  tournaments: Array.from({ length: 9 }, (_, i) => ({
    ...beatmapStats.tournaments[0],
    tournament: { id: 700 + i, name: `T${i}` },
    startTime: `2025-0${(i % 9) + 1}-01T00:00:00.000Z`,
  })),
};

describe('beatmap card', () => {
  test('carries the cover, the specs line, mod bars, top scores, and recent pools', () => {
    const reply = beatmapCard(beatmapStats, ctx);
    const [embed] = reply.embeds;
    expect(embed).toMatchObject({
      color: 0x5a8ff0,
      author: { name: 'osu! · mapped by Asphyxia' },
      title: 'xi - Blue Zenith [FOUR DIMENSIONS]',
      url: `${siteUrl}/beatmaps/658127`,
      image: {
        url: 'https://assets.ppy.sh/beatmaps/292301/covers/cover@2x.jpg',
      },
      footer: { text: 'o!TR · osu!' },
    });
    expect(embed.thumbnail).toBeUndefined();
    expect(embed.description).toContain(
      '★ **7.04** · 200 BPM · 4:22 · CS 4 · AR 9.6 · OD 9 · HP 5 · [osu!](https://osu.ppy.sh/b/658127)'
    );
    expect(embed.description).toContain(
      'Pooled in **12** tournaments (10 verified) · **384** verified games'
    );
    expect(embed.fields?.map((f) => f.name)).toEqual([
      'Mods',
      'Top scores',
      'Recent pools',
    ]);
    expect(embed.fields?.[0].value).toContain('NM  ▰▰▰▰▰▰▰▰▱▱  78%');
    expect(embed.fields?.[0].value).not.toContain('FL');
    expect(embed.fields?.[1].value.split('\n')).toHaveLength(6);
    expect(embed.fields?.[1].value).toContain(
      '1,214,905  Cytusine  HDHR  99.1%  Corsace Open 2025'
    );
    expect(embed.fields?.[2].value).toBe(
      `[Corsace Open 2025](${siteUrl}/tournaments/512) 4v4 #1,000+ · [osu! World Cup 2024](${siteUrl}/tournaments/513) 4v4 Open rank · [5 Digit World Cup](${siteUrl}/tournaments/514) 3v3 #1,000+`
    );
    expect(
      reply.components![0].components.map((c) => ('label' in c ? c.label : ''))
    ).toEqual(['Overview', 'Scores', 'Tournaments', 'osu!']);
  });

  test('a map without verified games is grey, says so, and hides the mods and scores', () => {
    const reply = beatmapCard(
      {
        ...beatmapStats,
        summary: {
          ...beatmapStats.summary,
          totalGameCount: 0,
          totalTournamentCount: 2,
        },
      },
      ctx
    );
    expect(reply.embeds[0].color).toBe(0x8c8c8c);
    expect(reply.embeds[0].description).toContain(
      'No verified games yet. Pooled in 2 tournaments.'
    );
    expect(reply.embeds[0].fields?.map((f) => f.name)).toEqual([
      'Recent pools',
    ]);
    expect(reply.embeds[0].image?.url).toContain('cover@2x.jpg');
    expect(reply.components![0].components).toHaveLength(3);
  });

  test('a map without a fetched set falls back to its id and has no cover', () => {
    const beatmap = {
      ...beatmapStats.beatmap,
      beatmapset: null,
      diffName: '',
      creators: [],
    };
    const [embed] = beatmapCard({ ...beatmapStats, beatmap }, ctx).embeds;
    expect(embed.title).toBe('Beatmap 658127');
    expect(embed.image).toBeUndefined();
    expect(embed.author?.name).toBe('osu! · mapped by unknown');
  });

  test('a single tournament and game read in the singular', () => {
    const summary = {
      ...beatmapStats.summary,
      totalTournamentCount: 1,
      verifiedTournamentCount: 1,
      totalGameCount: 1,
    };
    expect(
      beatmapCard({ ...beatmapStats, summary }, ctx).embeds[0].description
    ).toContain(
      'Pooled in **1** tournament (1 verified) · **1** verified game'
    );
  });

  test('the card stays within the limits after finalize', () => {
    expect(() => finalize(beatmapCard(beatmapStats, ctx))).not.toThrow();
  });

  test('the scores page lists ten and attaches the percentile curve', () => {
    const reply = beatmapScores(beatmapStats, ctx);
    expect(reply.embeds[0].image).toEqual({ url: 'attachment://scores.png' });
    expect(reply.files?.[0].name).toBe('scores.png');
    expect(reply.embeds[0].fields?.[0].value.split('\n')).toHaveLength(9);
    expect(reply.embeds[0].description).toContain(
      '**1,925** scores on the curve'
    );
  });

  test('the tournaments page lists eight per page newest first', () => {
    const reply = beatmapTournaments(
      many,
      { view: 'bt', key: '658127', ruleset: null, page: 1 },
      ctx
    );
    const lines = reply.embeds[0].description!.split('\n\n')[1].split('\n');
    expect(lines).toHaveLength(8);
    expect(lines[0]).toBe(
      `[T8](${siteUrl}/tournaments/708) · 4v4 · #1,000+ · 32 games · <t:1756684800:d>`
    );
    expect(reply.embeds[0].footer?.text).toBe(
      'o!TR · osu! · 9 tournaments · page 1 of 2'
    );
  });

  test('the tournaments page gives every button a distinct id', () => {
    for (const page of [1, 2]) {
      const ids = customIds(
        beatmapTournaments(
          many,
          { view: 'bt', key: '658127', ruleset: null, page },
          ctx
        )
      );
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

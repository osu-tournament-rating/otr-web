import { describe, expect, test, spyOn } from 'bun:test';

import {
  beatmapStats,
  beatmapTierSummary,
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
  test('groups map context and presents one compact median row per tier', () => {
    const reply = beatmapCard(
      {
        ...beatmapStats,
        tierBreakdown: {
          ...beatmapStats.tierBreakdown,
          tiers: [beatmapTierSummary],
        },
      },
      ctx
    );
    const [embed] = reply.embeds;
    expect(embed).toMatchObject({
      author: { name: 'osu! · mapped by Asphyxia' },
      title: 'xi - Blue Zenith [FOUR DIMENSIONS]',
      url: `${siteUrl}/beatmaps/658127`,
      thumbnail: {
        url: 'https://assets.ppy.sh/beatmaps/292301/covers/cover@2x.jpg',
      },
    });
    expect(embed.fields?.map((f) => f.name)).toEqual([
      '🏆 Tournament usage',
      '🎲 Mods · plays',
      '🕒 Recent pools',
      '📊 Typical performance by tier',
    ]);
    expect(embed.fields?.[0].value).toContain('**384** verified games');
    expect(embed.fields?.[1].value).toContain('NM  78%');
    expect(embed.fields?.[2].value.split('\n')).toHaveLength(4);
    expect(embed.fields?.[2].value).toStartWith('**[');
    expect(embed.fields?.[2].value).toMatch(/\*\* .*\n↳ 4v4/);
    expect(embed.fields?.[2].value).not.toContain('\n\n');
    expect(JSON.stringify(reply)).not.toContain(
      'plays have a pre-match rating'
    );
    expect(reply.files).toBeUndefined();
    expect(embed.image).toBeUndefined();
    expect(embed.fields?.[3].value).toContain(
      '<:tier_gold3:1> Gold · **600k** · **95.0%**'
    );
    expect(embed.fields?.[3].value).not.toContain('middle 50%');
    expect(embed.fields?.[3].value).not.toContain('400,000');
    expect(reply.components).toBeUndefined();
    expect(() => finalize(reply)).not.toThrow();
  });

  test('pool ages use tournament start dates and whole days', () => {
    const clock = spyOn(Date, 'now').mockReturnValue(
      Date.parse('2026-03-01T00:00:00Z')
    );
    try {
      const tournaments = ['2026-02-03T00:00:00Z', null].map((startTime) => ({
        ...beatmapStats.tournaments[0],
        startTime,
      }));
      const fields = beatmapCard({ ...beatmapStats, tournaments }, ctx)
        .embeds[0].fields!;
      const pools = fields.find((f) => f.name.includes('Recent pools'))!.value;
      expect(pools).toContain('26d ago');
      expect(pools).toContain('Start date unknown');
    } finally {
      clock.mockRestore();
    }
  });

  test('missing accuracy is distinct from zero and tier emojis retain names', () => {
    const tiers = [
      {
        ...beatmapTierSummary,
        tier: 'Grandmaster' as const,
        medianAccuracy: null,
        p25Accuracy: null,
        p75Accuracy: null,
      },
      {
        ...beatmapTierSummary,
        medianAccuracy: 0,
        p25Accuracy: 0,
        p75Accuracy: 0,
      },
    ];
    const reply = beatmapCard(
      {
        ...beatmapStats,
        tierBreakdown: { ...beatmapStats.tierBreakdown, tiers },
      },
      { ...ctx, emoji: (name) => `<:${name}:123>` }
    );
    const rows = reply.embeds[0].fields!.at(-1)!.value.split('\n');
    expect(rows).toEqual([
      '<:tier_grandmaster3:123> GM+ · **600k** · No accuracy',
      '<:tier_gold3:123> Gold · **600k** · **0.0%**',
    ]);
  });

  test('all eight tiers and large values fit without truncating rows', () => {
    const tiers = [
      'Bronze',
      'Silver',
      'Gold',
      'Platinum',
      'Emerald',
      'Diamond',
      'Master',
      'Grandmaster',
    ].map((tier) => ({
      ...beatmapTierSummary,
      tier: tier as typeof beatmapTierSummary.tier,
      scoreCount: 999999,
      medianScore: 12345678,
    }));
    const reply = beatmapCard(
      {
        ...beatmapStats,
        tierBreakdown: { ...beatmapStats.tierBreakdown, tiers },
      },
      { ...ctx, emoji: (name) => `<:${name}:1234567890123456789>` }
    );
    expect(reply.embeds[0].fields).toHaveLength(4);
    expect(reply.embeds[0].fields!.at(-1)!.value.split('\n')).toHaveLength(8);
    expect(finalize(reply).embeds?.[0]).toEqual(reply.embeds[0]);
  });

  test('no verified games is distinct from insufficient tier samples', () => {
    const reply = beatmapCard(
      {
        ...beatmapStats,
        summary: { ...beatmapStats.summary, totalGameCount: 0 },
      },
      ctx
    );
    expect(reply.embeds[0].color).toBe(0x8c8c8c);
    expect(reply.embeds[0].fields?.at(-1)?.value).toBe(
      'No verified games yet.'
    );
    expect(reply.embeds[0].image).toBeUndefined();
    expect(reply.files).toBeUndefined();
    expect(reply.components).toBeUndefined();
    const sparse = beatmapCard(beatmapStats, ctx);
    expect(sparse.embeds[0].fields?.at(-1)?.value).toContain(
      'No tier has at least five plays yet.'
    );
    expect(sparse.embeds[0].image).toBeUndefined();
  });

  test('missing ratings and no charted-mod samples have honest separate states', () => {
    for (const [totalScoreCount, expected] of [
      [10, 'No plays with pre-match ratings yet.'],
      [0, 'No NM, HD, HR or DT plays yet.'],
    ] as const) {
      const reply = beatmapCard(
        {
          ...beatmapStats,
          tierBreakdown: { ratedScoreCount: 0, totalScoreCount, tiers: [] },
        },
        ctx
      );
      expect(reply.embeds[0].fields?.at(-1)?.value).toBe(expected);
    }
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
      beatmapCard({ ...beatmapStats, summary }, ctx).embeds[0].fields?.[0].value
    ).toContain('**1** tournament · **1** verified\n**1** verified game');
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

test('main reply never substitutes mixed history for competitive data and escapes pool names', () => {
  const stats = {
    ...beatmapStats,
    summary: { ...beatmapStats.summary, totalPlayedGameCount: 987654321 },
    tournaments: [
      {
        ...beatmapStats.tournaments[0],
        verificationStatus: 3,
        tournament: {
          id: 1,
          name: 'Pool **bold** [link](https://example.com)',
        },
        gameCount: 987654321,
      },
    ],
  };
  const reply = beatmapCard(stats, { ...ctx, emoji: () => '' });
  const embed = reply.embeds[0];
  expect(
    embed.fields!.find((f) => f.name.includes('Recent pools'))!.value
  ).toContain('Rejected');
  expect(JSON.stringify(reply)).not.toContain('987654321');
  expect(embed.description).not.toContain(' HP ');
  expect(embed.description).toStartWith('★ **7.04**');
  expect(
    embed.fields!.find((f) => f.name.includes('Recent pools'))!.value
  ).toContain('\\*\\*bold\\*\\*');
});

test('status emoji names distinguish final and provisional pool decisions', () => {
  for (const [status, label] of [
    [0, 'Pending'],
    [1, 'Pre-rejected'],
    [2, 'Pre-verified'],
    [3, 'Rejected'],
    [4, 'Verified'],
  ] as const) {
    const reply = beatmapCard(
      {
        ...beatmapStats,
        tournaments: [
          { ...beatmapStats.tournaments[0], verificationStatus: status },
        ],
      },
      { ...ctx, emoji: () => '' }
    );
    const text = reply.embeds[0].fields!.find((f) =>
      f.name.includes('Recent pools')
    )!.value;
    expect(text).toContain(label);
  }
});

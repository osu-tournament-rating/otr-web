import { describe, expect, it } from 'bun:test';
import { Ruleset, VerificationStatus } from '@otr/core/osu';

import {
  getCategoryTicks,
  getLobbySizeBars,
  getRatingBucketStart,
  getRatingDistribution,
  getRulesetBars,
  getVerificationBars,
  getYearBars,
  sumCounts,
} from '@/components/stats/stats-data';
import { STATS_PARAMS } from '@/components/stats/stats-params';
import { listStateHref, parseListState } from '@/lib/kit/lists/params';

describe('getVerificationBars', () => {
  it('groups Pending, Pre-verified and Pre-rejected into one bar', () => {
    const bars = getVerificationBars({
      [`${VerificationStatus.None}`]: 4,
      [`${VerificationStatus.PreRejected}`]: 12,
      [`${VerificationStatus.PreVerified}`]: 54,
      [`${VerificationStatus.Rejected}`]: 387,
      [`${VerificationStatus.Verified}`]: 2540,
    });

    expect(bars.map((bar) => [bar.label, bar.count])).toEqual([
      ['Verified', 2540],
      ['Not in ratings yet', 70],
      ['Rejected', 387],
    ]);
    expect(sumCounts(bars)).toBe(2997);
  });

  it('colours each bar with the verification palette, never a series colour', () => {
    const fills = getVerificationBars({}).map((bar) => bar.fill);
    expect(fills).toEqual([
      'var(--verification-verified)',
      'var(--verification-neutral)',
      'var(--verification-rejected)',
    ]);
  });

  it('keeps all three groups when some are empty', () => {
    const bars = getVerificationBars({ [`${VerificationStatus.Verified}`]: 3 });
    expect(bars.map((bar) => bar.count)).toEqual([3, 0, 0]);
  });
});

describe('getYearBars', () => {
  it('fills years without tournaments and labels years without separators', () => {
    const bars = getYearBars({ '2019': 126, '2016': 3, '2018': 45 });
    expect(bars.map((bar) => [bar.label, bar.count])).toEqual([
      ['2016', 3],
      ['2017', 0],
      ['2018', 45],
      ['2019', 126],
    ]);
  });

  it('is empty without data', () => {
    expect(getYearBars({})).toEqual([]);
  });
});

describe('getRulesetBars', () => {
  it('lists the rated rulesets in order with their short names', () => {
    const bars = getRulesetBars({
      '0': 2063,
      '1': 154,
      '2': 126,
      '3': 0,
      '4': 163,
      '5': 34,
    });
    expect(bars.map((bar) => [bar.label, bar.count])).toEqual([
      ['osu!', 2063],
      ['taiko', 154],
      ['catch', 126],
      ['mania 4K', 163],
      ['mania 7K', 34],
    ]);
  });

  it('adds mania (other) only when it has tournaments', () => {
    const bars = getRulesetBars({ [`${Ruleset.ManiaOther}`]: 2 });
    expect(bars.at(-1)).toEqual({
      key: `${Ruleset.ManiaOther}`,
      label: 'mania (other)',
      count: 2,
    });
    expect(bars.every((bar) => bar.fill === undefined)).toBe(true);
  });
});

describe('getLobbySizeBars', () => {
  it('runs from 1v1 to the largest size, filling sizes with none', () => {
    const bars = getLobbySizeBars({ '1': 1166, '2': 732, '4': 297, '8': 2 });
    expect(bars.map((bar) => bar.label)).toEqual([
      '1v1',
      '2v2',
      '3v3',
      '4v4',
      '5v5',
      '6v6',
      '7v7',
      '8v8',
    ]);
    expect(bars.map((bar) => bar.count)).toEqual([
      1166, 732, 0, 297, 0, 0, 0, 2,
    ]);
  });
});

describe('getRatingDistribution', () => {
  it('fills empty buckets and accumulates the share at or below each one', () => {
    const { buckets, totalPlayers, tiers } = getRatingDistribution(
      { '375': 1, '425': 3 },
      25
    );

    expect(totalPlayers).toBe(4);
    expect(buckets.map((bucket) => [bucket.rating, bucket.count])).toEqual([
      [375, 1],
      [400, 0],
      [425, 3],
    ]);
    expect(buckets.map((bucket) => bucket.cumulative)).toEqual([0.25, 0.25, 1]);
    expect(tiers).toEqual(['Bronze', 'Silver']);
  });

  it('colours each bucket with its tier', () => {
    const { buckets } = getRatingDistribution({ '1000': 2, '2500': 1 }, 25);
    const first = buckets[0];
    const last = buckets[buckets.length - 1];

    expect([first.tier, first.subTier, first.fill]).toEqual([
      'Platinum',
      3,
      'var(--tier-platinum)',
    ]);
    expect([last.tier, last.subTier, last.fill]).toEqual([
      'Elite Grandmaster',
      undefined,
      'var(--tier-elite-grandmaster)',
    ]);
  });

  it('is empty without ratings', () => {
    expect(getRatingDistribution({}, 25)).toEqual({
      buckets: [],
      totalPlayers: 0,
      tiers: [],
    });
  });

  it('puts a rating in the bucket that starts at or below it', () => {
    expect(getRatingBucketStart(1024.9, 25)).toBe(1000);
    expect(getRatingBucketStart(1025, 25)).toBe(1025);
  });
});

describe('getCategoryTicks', () => {
  it('labels every category when they all fit', () => {
    expect(getCategoryTicks([2024], 6)).toEqual([2024]);
    expect(getCategoryTicks([1500, 1525, 1550], 4)).toEqual([1500, 1525, 1550]);
  });

  it('picks round values from the data by the tick rule', () => {
    const years = Array.from({ length: 12 }, (_, index) => 2015 + index);
    expect(getCategoryTicks(years, 6)).toEqual([
      2016, 2018, 2020, 2022, 2024, 2026,
    ]);
    expect(getCategoryTicks(years, 4)).toEqual([2015, 2020, 2025]);

    const starts = Array.from({ length: 117 }, (_, index) => 100 + index * 25);
    expect(getCategoryTicks(starts, 6)).toEqual([
      500, 1000, 1500, 2000, 2500, 3000,
    ]);
  });
});

describe('STATS_PARAMS', () => {
  it('reads the ruleset from the address and defaults to osu!', () => {
    expect(parseListState(STATS_PARAMS, '').ruleset).toBe(Ruleset.Osu);
    expect(parseListState(STATS_PARAMS, 'ruleset=4').ruleset).toBe(
      Ruleset.Mania4k
    );
    // mania (other) has no rating distribution of its own.
    expect(parseListState(STATS_PARAMS, 'ruleset=3').ruleset).toBe(Ruleset.Osu);
  });

  it('never writes the default', () => {
    expect(
      listStateHref('/stats', STATS_PARAMS, { ruleset: Ruleset.Osu })
    ).toBe('/stats');
    expect(
      listStateHref('/stats', STATS_PARAMS, { ruleset: Ruleset.Taiko })
    ).toBe('/stats?ruleset=1');
  });
});

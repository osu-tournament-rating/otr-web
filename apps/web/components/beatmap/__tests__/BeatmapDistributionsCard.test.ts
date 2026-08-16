import { Mods } from '@otr/core/osu';
import { describe, expect, it } from 'bun:test';

import { toRankRangeModSegments } from '@/components/beatmap/BeatmapDistributionsCard';
import type { BeatmapRankRangeModDistribution } from '@/lib/orpc/schema/beatmapStats';

/** Percentages are recomputed by the display pipeline, so any value works. */
function bucket(
  rankRange: BeatmapRankRangeModDistribution['rankRange'],
  rows: Array<{ mods: number; scoreCount: number }>
): BeatmapRankRangeModDistribution {
  const scoreCount = rows.reduce((total, row) => total + row.scoreCount, 0);

  return {
    rankRange,
    scoreCount,
    distribution: rows.map((row) => ({
      ...row,
      percentage: scoreCount > 0 ? (row.scoreCount / scoreCount) * 100 : 0,
    })),
  };
}

describe('toRankRangeModSegments', () => {
  it('returns nothing for an empty payload', () => {
    const byBucket = toRankRangeModSegments([]);

    expect(byBucket.size).toBe(0);
  });

  it('computes per-bucket percentages against the bucket total', () => {
    const byBucket = toRankRangeModSegments([
      bucket('open', [
        { mods: Mods.None, scoreCount: 30 },
        { mods: Mods.HardRock, scoreCount: 10 },
      ]),
    ]);

    const open = byBucket.get('open');

    expect(open?.scoreCount).toBe(40);
    expect(open?.segments.map(({ label }) => label)).toEqual(['NM', 'HR']);
    expect(open?.segments.map(({ percentage }) => percentage)).toEqual([
      75, 25,
    ]);
  });

  it('keeps buckets independent so a mod can dominate only one bracket', () => {
    const byBucket = toRankRangeModSegments([
      bucket('open', [{ mods: Mods.HardRock, scoreCount: 20 }]),
      bucket('10kPlus', [{ mods: Mods.None, scoreCount: 60 }]),
    ]);

    expect(byBucket.get('open')?.segments[0]?.label).toBe('HR');
    expect(byBucket.get('10kPlus')?.segments[0]?.label).toBe('NM');
  });

  it('skips buckets whose distribution has no scores', () => {
    const byBucket = toRankRangeModSegments([
      bucket('open', [{ mods: Mods.None, scoreCount: 5 }]),
      bucket('lt1k', []),
    ]);

    expect([...byBucket.keys()]).toEqual(['open']);
  });

  it('normalizes display mods the same way as the mod distribution chart', () => {
    const byBucket = toRankRangeModSegments([
      bucket('open', [
        { mods: Mods.Nightcore | Mods.DoubleTime, scoreCount: 4 },
        { mods: Mods.DoubleTime | Mods.NoFail, scoreCount: 6 },
      ]),
    ]);

    expect(
      byBucket
        .get('open')
        ?.segments.map(({ label, scoreCount }) => [label, scoreCount])
    ).toEqual([['DT', 10]]);
  });
});

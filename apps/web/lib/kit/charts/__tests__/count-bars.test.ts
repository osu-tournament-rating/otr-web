import { describe, expect, it } from 'bun:test';

import {
  type CountBarDatum,
  getCountAxisTicks,
  hasOwnFills,
} from '@/lib/kit/charts/count-bars';

const bars = (...counts: number[]): CountBarDatum[] =>
  counts.map((count, index) => ({
    key: String(index),
    label: `Category ${index + 1}`,
    count,
  }));

describe('getCountAxisTicks', () => {
  it('starts at zero with whole steps', () => {
    const ticks = getCountAxisTicks(bars(12, 845, 301));
    expect(ticks.ticks[0]).toBe(0);
    expect(ticks.max).toBeGreaterThanOrEqual(845);
    expect(ticks.ticks.every(Number.isInteger)).toBe(true);
    expect(ticks.ticks.length).toBeLessThanOrEqual(6);
  });

  it('thins a count along the bottom on phones, but not a value axis', () => {
    const data = bars(1_489, 803, 42);
    expect(
      getCountAxisTicks(data, { layout: 'rows', narrow: true }).ticks.length
    ).toBeLessThanOrEqual(4);
    expect(
      getCountAxisTicks(data, { layout: 'columns', narrow: true })
    ).toEqual(getCountAxisTicks(data));
  });

  it('still draws an axis for no data or all zeroes', () => {
    expect(getCountAxisTicks([]).ticks).toEqual([0, 1]);
    expect(getCountAxisTicks(bars(0, 0)).ticks).toEqual([0, 1]);
  });

  it('ignores counts that are not numbers', () => {
    expect(getCountAxisTicks(bars(Number.NaN, 40)).max).toBe(40);
  });
});

describe('hasOwnFills', () => {
  it('is true when any bar brings its colour', () => {
    expect(hasOwnFills(bars(1, 2))).toBe(false);
    expect(
      hasOwnFills([
        ...bars(1),
        {
          key: 'x',
          label: 'X',
          count: 3,
          fill: 'var(--verification-verified)',
        },
      ])
    ).toBe(true);
  });
});

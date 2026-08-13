import { describe, expect, it } from 'bun:test';

import {
  formatAccuracyTick,
  formatScoreTick,
  getBoxPlotAxis,
  getNiceAxis,
  toAxisPercent,
  toBoxPlotMarks,
} from '@/lib/beatmaps/chart-axis';

describe('getNiceAxis', () => {
  it('widens a clustered band onto round ticks', () => {
    const axis = getNiceAxis(1_003_412, 1_126_980);

    expect(axis.min).toBe(1_000_000);
    expect(axis.max).toBe(1_150_000);
    expect(axis.ticks).toEqual([1_000_000, 1_050_000, 1_100_000, 1_150_000]);
  });

  it('covers a wide range without exceeding the tick budget', () => {
    const axis = getNiceAxis(15_000, 1_209_000);

    expect(axis.min).toBe(0);
    expect(axis.max).toBe(1_250_000);
    expect(axis.ticks).toHaveLength(6);
  });

  it('honors a tighter tick budget on narrow screens', () => {
    const axis = getNiceAxis(15_000, 1_209_000, 4);

    expect(axis.ticks.length).toBeLessThanOrEqual(4);
    expect(axis.min).toBeLessThanOrEqual(15_000);
    expect(axis.max).toBeGreaterThanOrEqual(1_209_000);
  });

  it('keeps fractional accuracy ticks exact', () => {
    const axis = getNiceAxis(88.4, 99.7);

    expect(axis.min).toBe(87.5);
    expect(axis.max).toBe(100);
    expect(axis.ticks).toEqual([87.5, 90, 92.5, 95, 97.5, 100]);
  });

  it('never overshoots a full-accuracy ceiling', () => {
    const axis = getNiceAxis(96.2, 100);

    expect(axis.max).toBe(100);
  });

  it('always brackets the data it was given', () => {
    for (const [min, max] of [
      [0, 1],
      [999, 1_001],
      [850_432, 850_433],
      [0, 1_000_000],
      [70.15, 99.99],
    ] as const) {
      const axis = getNiceAxis(min, max);
      expect(axis.min).toBeLessThanOrEqual(min);
      expect(axis.max).toBeGreaterThanOrEqual(max);
    }
  });

  it('collapses to a single tick when every value is identical', () => {
    expect(getNiceAxis(950_000, 950_000)).toEqual({
      min: 950_000,
      max: 950_000,
      ticks: [950_000],
    });
  });

  it('falls back to zero with nothing to chart', () => {
    expect(getNiceAxis(0, 0)).toEqual({ min: 0, max: 0, ticks: [0] });
  });
});

describe('getBoxPlotAxis', () => {
  const mania = [
    // A quit run at 12k next to a mania field that lives above 950k.
    { min: 12_000, p25: 962_000, median: 978_400, p75: 986_100, max: 994_800 },
    { min: 903_500, p25: 955_200, median: 971_000, p75: 980_300, max: 989_100 },
  ];

  it('floors on the lowest p25, not the lowest outlier', () => {
    const axis = getBoxPlotAxis(mania);

    expect(axis.min).toBe(950_000);
    expect(axis.max).toBe(1_000_000);
  });

  it('keeps every box inside the domain it produces', () => {
    const axis = getBoxPlotAxis(mania);

    for (const group of mania) {
      expect(group.p25).toBeGreaterThanOrEqual(axis.min);
      expect(group.max).toBeLessThanOrEqual(axis.max);
    }
  });

  it('falls back to zero with nothing to chart', () => {
    expect(getBoxPlotAxis([])).toEqual({ min: 0, max: 0, ticks: [0] });
  });
});

describe('toBoxPlotMarks', () => {
  const axis = getNiceAxis(950_000, 1_000_000);

  it('flags a whisker the axis cuts off', () => {
    const marks = toBoxPlotMarks(
      {
        min: 12_000,
        p25: 962_000,
        median: 978_400,
        p75: 986_100,
        max: 994_800,
      },
      axis
    );

    expect(marks.minClamped).toBe(true);
    expect(marks.minPercent).toBe(0);
    expect(marks.maxClamped).toBe(false);
  });

  it('leaves a whisker inside the domain unflagged', () => {
    const marks = toBoxPlotMarks(
      {
        min: 960_000,
        p25: 962_000,
        median: 978_400,
        p75: 986_100,
        max: 994_800,
      },
      axis
    );

    expect(marks.minClamped).toBe(false);
    expect(marks.maxClamped).toBe(false);
  });
});

describe('formatScoreTick', () => {
  it('shortens thousands and millions', () => {
    expect(formatScoreTick(0)).toBe('0');
    expect(formatScoreTick(250_000)).toBe('250k');
    expect(formatScoreTick(1_000_000)).toBe('1M');
    expect(formatScoreTick(1_250_000)).toBe('1.25M');
    expect(formatScoreTick(1_050_000)).toBe('1.05M');
  });

  it('rounds off sub-thousand noise', () => {
    expect(formatScoreTick(45_160)).toBe('45k');
    expect(formatScoreTick(295_162)).toBe('295k');
    expect(formatScoreTick(999_600)).toBe('1M');
  });
});

describe('formatAccuracyTick', () => {
  it('drops trailing zeros but keeps a half step', () => {
    expect(formatAccuracyTick(95)).toBe('95%');
    expect(formatAccuracyTick(97.5)).toBe('97.5%');
    expect(formatAccuracyTick(100)).toBe('100%');
  });
});

describe('toAxisPercent', () => {
  it('spreads a narrow band across the whole track', () => {
    // The old 0-anchored scale put these within 11% of each other.
    expect(toAxisPercent(1_000_000, 1_000_000, 1_127_000)).toBe(0);
    expect(toAxisPercent(1_127_000, 1_000_000, 1_127_000)).toBe(100);
    expect(Math.round(toAxisPercent(1_063_500, 1_000_000, 1_127_000))).toBe(50);
  });

  it('clamps values outside the domain', () => {
    expect(toAxisPercent(900_000, 1_000_000, 1_127_000)).toBe(0);
    expect(toAxisPercent(1_200_000, 1_000_000, 1_127_000)).toBe(100);
  });

  it('centers marks when every value is identical', () => {
    expect(toAxisPercent(1_000_000, 1_000_000, 1_000_000)).toBe(50);
  });
});

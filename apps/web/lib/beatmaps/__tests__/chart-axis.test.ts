import { describe, expect, it } from 'bun:test';

import {
  formatAccuracyTick,
  formatScoreTick,
  getBoxPlotAxis,
  getBoxPlotView,
  getNiceAxis,
  getScaleTicks,
  getScatterAxis,
  toAxisPercent,
  toBoxPlotMarks,
  type BoxPlotQuartiles,
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

  it('brackets a requested floor it cannot land on', () => {
    // The box plot axis leans on this: the floor is only ever rounded down, so
    // truncating at p20 can never cut into a row above its p20.
    for (const [min, max] of [
      [398_243, 1_200_000],
      [389_252, 1_180_400],
      [951_800, 994_800],
      [12_001, 12_002],
      [0.37, 99.63],
      [1, 3],
    ] as const) {
      expect(getNiceAxis(min, max).min).toBeLessThanOrEqual(min);
    }
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

describe('getScatterAxis', () => {
  it('has nothing to chart without values', () => {
    expect(getScatterAxis([])).toBeNull();
  });

  it('parks a lone value on its own domain', () => {
    expect(getScatterAxis([500_000])).toEqual({
      min: 500_000,
      max: 500_000,
      ticks: [500_000],
      floor: 500_000,
    });
  });

  it('leaves a small sample undistorted', () => {
    // The 1st percentile of two points sits 1% above the lower one (21,780),
    // which rounds down to the same zero floor the raw minimum would give.
    const axis = getScatterAxis([12_000, 990_000]);

    expect(axis?.min).toBe(0);
    expect(axis?.max).toBe(1_000_000);
    expect(axis?.floor).toBe(0);
  });

  it('collapses when every score is identical', () => {
    const axis = getScatterAxis(Array.from({ length: 5 }, () => 950_000));

    expect(axis?.min).toBe(950_000);
    expect(axis?.max).toBe(950_000);
    expect(axis?.floor).toBe(950_000);
  });

  it('charts the raw range when the quantile reaches the ceiling', () => {
    // A lone low score under a wall of maxima: the 1st percentile *is* the
    // maximum, so clamping there would hide all 1000 points.
    const axis = getScatterAxis([
      200_000,
      ...Array.from({ length: 999 }, () => 1_000_000),
    ]);

    expect(axis?.min).toBe(200_000);
    expect(axis?.max).toBe(1_000_000);
    expect(axis?.floor).toBe(200_000);
  });

  it('zooms past a quit run on a mania field', () => {
    // The real shape of /beatmaps/2251585: one 287,618 score under 327 that
    // live between 860k and 999k. Anchoring on the minimum spans 200k..1M and
    // leaves four fifths of the plot empty.
    const spread = Array.from(
      { length: 327 },
      (_, index) => 860_000 + (index * (998_537 - 860_000)) / 326
    );
    const axis = getScatterAxis([287_618, ...spread]);

    expect(axis?.min).toBe(850_000);
    expect(axis?.max).toBe(1_000_000);
    expect(axis?.ticks).toEqual([850_000, 900_000, 950_000, 1_000_000]);
    expect(axis?.floor).toBe(850_000);
    expect(287_618 < (axis?.floor ?? 0)).toBe(true);
    expect(spread.every((score) => score >= (axis?.floor ?? 0))).toBe(true);
  });
});

const mania: BoxPlotQuartiles[] = [
  // A quit run at 12k next to a mania field that lives above 950k.
  {
    min: 12_000,
    p20: 958_400,
    p25: 962_000,
    median: 978_400,
    p75: 986_100,
    max: 994_800,
  },
  {
    min: 903_500,
    p20: 951_800,
    p25: 955_200,
    median: 971_000,
    p75: 980_300,
    max: 989_100,
  },
];

describe('getBoxPlotAxis', () => {
  it('floors on the lowest p20, not the lowest outlier', () => {
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

  it("never truncates above any row's twentieth percentile", () => {
    // The first two rows are the measured mod combinations of /beatmaps/2017881,
    // the shape that used to draw a chevron on top of its own box.
    const shapes: BoxPlotQuartiles[][] = [
      [
        {
          min: 64_477,
          p20: 398_243,
          p25: 414_854,
          median: 543_717,
          p75: 712_905,
          max: 1_200_000,
        },
        {
          min: 70_124,
          p20: 389_252,
          p25: 426_698,
          median: 578_528,
          p75: 744_310,
          max: 1_180_400,
        },
      ],
      mania,
      [
        {
          min: 88.12,
          p20: 94.4,
          p25: 95.02,
          median: 97.31,
          p75: 98.64,
          max: 99.91,
        },
      ],
    ];

    for (const groups of shapes) {
      const axis = getBoxPlotAxis(groups);

      for (const group of groups) {
        expect(axis.min).toBeLessThanOrEqual(group.p20);
        expect(axis.min).toBeLessThan(group.median);
      }
    }
  });

  it('falls back to zero with nothing to chart', () => {
    expect(getBoxPlotAxis([])).toEqual({ min: 0, max: 0, ticks: [0] });
  });
});

describe('getBoxPlotView', () => {
  const tight: BoxPlotQuartiles[] = [
    {
      min: 960_000,
      p20: 962_000,
      p25: 963_000,
      median: 978_400,
      p75: 986_100,
      max: 994_800,
    },
  ];

  it('offers to expand while a whisker is cut off', () => {
    expect(getBoxPlotView(mania, formatScoreTick).canExpand).toBe(true);
  });

  it('keeps offering the control once expanded', () => {
    // Measured against the truncated axis either way, so the control the
    // reader just used does not disappear under the cursor.
    expect(getBoxPlotView(mania, formatScoreTick, 6, true).canExpand).toBe(
      true
    );
  });

  it('reaches every minimum when expanded', () => {
    const { axis } = getBoxPlotView(mania, formatScoreTick, 6, true);

    expect(axis.min).toBeLessThanOrEqual(Math.min(...mania.map((g) => g.min)));
    expect(mania.every((g) => !toBoxPlotMarks(g, axis).minClamped)).toBe(true);
  });

  it('has nothing to expand into when no whisker is cut off', () => {
    const truncated = getBoxPlotView(tight, formatScoreTick);
    const expanded = getBoxPlotView(tight, formatScoreTick, 6, true);

    expect(truncated.canExpand).toBe(false);
    expect(expanded.axis).toEqual(truncated.axis);
  });

  it('carries the ticks of the axis it settled on', () => {
    const view = getBoxPlotView(mania, formatScoreTick);
    const scale = getScaleTicks(view.axis, formatScoreTick);

    expect(view.ticks).toEqual(scale.ticks);
    expect(view.gridPercents).toEqual(scale.gridPercents);
  });
});

describe('getScaleTicks', () => {
  it('labels every tick but draws gridlines only through the interior', () => {
    const { ticks, gridPercents } = getScaleTicks(
      getNiceAxis(950_000, 1_000_000),
      formatScoreTick
    );

    expect(ticks.map((tick) => tick.label)).toEqual([
      '950k',
      '960k',
      '970k',
      '980k',
      '990k',
      '1M',
    ]);
    expect(ticks.map((tick) => tick.percent)).toEqual([0, 20, 40, 60, 80, 100]);
    // The endpoints are dropped: a gridline there would trace the edges of the
    // track the rows are drawn on.
    expect(gridPercents).toEqual([20, 40, 60, 80]);
  });

  it('has no interior left to draw when the axis collapses to one tick', () => {
    const { ticks, gridPercents } = getScaleTicks(
      getNiceAxis(950_000, 950_000),
      formatScoreTick
    );

    expect(ticks).toEqual([{ value: 950_000, label: '950k', percent: 50 }]);
    expect(gridPercents).toEqual([]);
  });
});

describe('toBoxPlotMarks', () => {
  const axis = getNiceAxis(950_000, 1_000_000);

  it('flags a whisker the axis cuts off', () => {
    const marks = toBoxPlotMarks(
      {
        min: 12_000,
        p20: 958_400,
        p25: 962_000,
        median: 978_400,
        p75: 986_100,
        max: 994_800,
      },
      axis
    );

    expect(marks.minClamped).toBe(true);
    expect(marks.minPercent).toBe(0);
  });

  it('leaves a whisker inside the domain unflagged', () => {
    const marks = toBoxPlotMarks(
      {
        min: 960_000,
        p20: 961_000,
        p25: 962_000,
        median: 978_400,
        p75: 986_100,
        max: 994_800,
      },
      axis
    );

    expect(marks.minClamped).toBe(false);
  });

  it('never reports a cut-off maximum', () => {
    // The ceiling rounds up past the highest maximum by construction, so there
    // is no upper counterpart to minClamped to report.
    for (const groups of [mania, [mania[0]], [mania[1]]]) {
      const domain = getBoxPlotAxis(groups);

      for (const group of groups) {
        expect(domain.max).toBeGreaterThanOrEqual(group.max);
      }
    }
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

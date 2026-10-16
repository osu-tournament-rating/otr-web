import { describe, expect, it } from 'bun:test';

import { getNiceAxis } from '@/lib/beatmaps/chart-axis';
import { niceAxisProps } from '@/lib/kit/charts/axis';
import { getNiceTicks, getTimeTicks } from '@/lib/kit/charts/ticks';

const ALLOWED_MANTISSAS = [1, 2, 2.5, 5];

function isNiceStep(step: number): boolean {
  const mantissa = step / 10 ** Math.floor(Math.log10(step));
  return ALLOWED_MANTISSAS.some(
    (allowed) => Math.abs(allowed - mantissa) < 1e-9
  );
}

describe('getNiceTicks', () => {
  it('matches the beatmap pages on their own inputs', () => {
    for (const [min, max] of [
      [1_003_412, 1_126_980],
      [0, 987_654],
      [91.2, 99.8],
      [12, 845],
      [0, 3],
    ]) {
      const ours = getNiceTicks(min, max);
      const beatmap = getNiceAxis(min, max);
      expect(ours.ticks).toEqual(beatmap.ticks);
    }
  });

  it('never uses steps like 13 or 125', () => {
    // The old rating chart rule picked 125 for this range.
    expect(getNiceTicks(812, 1_340).ticks).toEqual([800, 1_000, 1_200, 1_400]);

    for (let max = 2; max < 5_000; max += 37) {
      for (const min of [0, 1, max / 3]) {
        const { step, ticks } = getNiceTicks(min, max);
        expect(isNiceStep(step)).toBe(true);
        expect(ticks.length).toBeLessThanOrEqual(6);
        expect(ticks.length).toBeGreaterThanOrEqual(2);
        expect(ticks[0]).toBeLessThanOrEqual(min);
        expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(max);
      }
    }
  });

  it('covers the data with evenly spaced ticks', () => {
    const { min, max, step, ticks } = getNiceTicks(1_437, 2_891);

    expect(min).toBe(1_000);
    expect(max).toBe(3_000);
    expect(step).toBe(500);
    expect(ticks[0]).toBe(min);
    expect(ticks[ticks.length - 1]).toBe(max);
    for (let index = 1; index < ticks.length; index++) {
      expect(ticks[index] - ticks[index - 1]).toBeCloseTo(step, 9);
    }
  });

  it('honours a lower tick limit for narrow charts', () => {
    const { ticks } = getNiceTicks(0, 987_654, { maxTicks: 4 });
    expect(ticks.length).toBeLessThanOrEqual(4);
    expect(ticks).toEqual([0, 500_000, 1_000_000]);
  });

  it('keeps counts on whole numbers', () => {
    expect(getNiceTicks(0, 3, { integer: true }).ticks).toEqual([0, 1, 2, 3]);
    expect(getNiceTicks(0, 2, { integer: true }).ticks).toEqual([0, 1, 2]);
    expect(getNiceTicks(0, 1, { integer: true }).ticks).toEqual([0, 1]);
    expect(getNiceTicks(0, 1).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('never goes below zero for non-negative data, but follows negative data', () => {
    expect(getNiceTicks(3, 97).min).toBe(0);
    expect(getNiceTicks(-12.4, 30.2).ticks).toEqual([-20, 0, 20, 40]);
  });

  it('keeps float dust off the labels', () => {
    expect(getNiceTicks(0.1, 0.7).ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
  });

  it('pads a flat series instead of collapsing the axis', () => {
    const flat = getNiceTicks(1_500, 1_500);
    expect(flat.min).toBeLessThan(1_500);
    expect(flat.max).toBeGreaterThan(1_500);
    expect(flat.ticks).toContain(1_500);

    expect(getNiceTicks(0, 0, { integer: true }).ticks).toEqual([0, 1]);
  });

  it('survives bad input', () => {
    expect(getNiceTicks(Number.NaN, 4).ticks).toEqual([0, 1]);
    expect(getNiceTicks(10, 2).ticks).toEqual(getNiceTicks(2, 10).ticks);
  });
});

describe('getNiceTicks within the data', () => {
  it('keeps the domain on the data and ticks inside it', () => {
    const buckets = getNiceTicks(200, 2_900, { within: true });

    expect(buckets.min).toBe(200);
    expect(buckets.max).toBe(2_900);
    expect(buckets.ticks).toEqual([500, 1_000, 1_500, 2_000, 2_500]);
  });

  it('still uses the shared steps and limit', () => {
    for (let max = 3; max < 5_000; max += 41) {
      for (const min of [0, 1, max / 3]) {
        const { step, ticks } = getNiceTicks(min, max, { within: true });
        expect(isNiceStep(step) || ticks.length === 2).toBe(true);
        expect(ticks.length).toBeLessThanOrEqual(6);
        expect(ticks[0]).toBeGreaterThanOrEqual(min);
        expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(max);
      }
    }
  });
});

describe('niceAxisProps', () => {
  it('hands Recharts the domain and every tick', () => {
    const props = niceAxisProps(getNiceTicks(0, 950, { integer: true }));

    expect(props.domain).toEqual([0, 1_000]);
    expect(props.ticks).toEqual([0, 200, 400, 600, 800, 1_000]);
    expect(props.interval).toBe(0);
    expect(props.allowDecimals).toBe(false);
  });
});

describe('getTimeTicks', () => {
  const utc = (year: number, month: number, day = 1) =>
    Date.UTC(year, month - 1, day);

  it('lands on year boundaries for multi-year ranges', () => {
    const { ticks, unit } = getTimeTicks(utc(2019, 3, 14), utc(2024, 9, 2));
    expect(unit).toBe('year');
    expect(ticks).toEqual(
      [2020, 2021, 2022, 2023, 2024].map((year) => utc(year, 1))
    );
  });

  it('lands on months counted from January for a year or so', () => {
    const { ticks, unit } = getTimeTicks(utc(2024, 2, 10), utc(2025, 1, 20));
    expect(unit).toBe('month');
    expect(ticks).toEqual(
      [3, 5, 7, 9, 11].map((month) => utc(2024, month)).concat(utc(2025, 1))
    );

    const quarters = getTimeTicks(utc(2023, 11, 2), utc(2025, 2, 1));
    expect(quarters.ticks).toEqual([
      utc(2024, 1),
      utc(2024, 4),
      utc(2024, 7),
      utc(2024, 10),
      utc(2025, 1),
    ]);
  });

  it('uses days for short ranges', () => {
    const { ticks, unit } = getTimeTicks(
      utc(2024, 7, 20),
      utc(2024, 7, 24) + 12 * 3_600_000
    );
    expect(unit).toBe('day');
    expect(ticks).toEqual([20, 21, 22, 23, 24].map((day) => utc(2024, 7, day)));
  });

  it('never exceeds the tick limit', () => {
    for (let days = 2; days < 4_000; days += 13) {
      const { ticks } = getTimeTicks(
        utc(2020, 1, 1),
        utc(2020, 1, 1) + days * 86_400_000
      );
      expect(ticks.length).toBeLessThanOrEqual(6);
      expect(ticks.length).toBeGreaterThanOrEqual(2);
    }
  });
});

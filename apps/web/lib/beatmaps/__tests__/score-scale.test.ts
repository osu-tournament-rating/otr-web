import { describe, expect, it } from 'bun:test';

import { getScoreFloor, toScorePercent } from '@/lib/beatmaps/score-scale';

describe('getScoreFloor', () => {
  it('rounds the lowest minimum down to the nearest 50k', () => {
    expect(getScoreFloor([1_003_412, 1_126_980])).toBe(1_000_000);
    expect(getScoreFloor([874_500, 902_100])).toBe(850_000);
  });

  it('keeps a minimum that already sits on the step', () => {
    expect(getScoreFloor([950_000, 1_100_000])).toBe(950_000);
  });

  it('never floors below zero', () => {
    expect(getScoreFloor([0])).toBe(0);
    expect(getScoreFloor([12_000])).toBe(0);
  });

  it('falls back to zero with nothing to chart', () => {
    expect(getScoreFloor([])).toBe(0);
  });
});

describe('toScorePercent', () => {
  it('spreads a narrow band across the whole track', () => {
    // The old 0-anchored scale put these within 11% of each other.
    expect(toScorePercent(1_000_000, 1_000_000, 1_127_000)).toBe(0);
    expect(toScorePercent(1_127_000, 1_000_000, 1_127_000)).toBe(100);
    expect(Math.round(toScorePercent(1_063_500, 1_000_000, 1_127_000))).toBe(
      50
    );
  });

  it('clamps values outside the domain', () => {
    expect(toScorePercent(900_000, 1_000_000, 1_127_000)).toBe(0);
    expect(toScorePercent(1_200_000, 1_000_000, 1_127_000)).toBe(100);
  });

  it('centers marks when every score is identical', () => {
    expect(toScorePercent(1_000_000, 1_000_000, 1_000_000)).toBe(50);
  });
});

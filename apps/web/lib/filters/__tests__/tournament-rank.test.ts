import { describe, expect, it } from 'bun:test';

import { tieredScale } from '../scale';
import {
  RANK_RANGE_MAX,
  RANK_RANGE_MIN,
  RANK_SLIDER_MAX,
  hasRankRangeFilter,
  moveRankBySliderStops,
  rankToSliderPosition,
  sliderPositionToRank,
  snapRankToSliderStop,
  toRankRangeFilter,
  tournamentRankScale,
} from '../tournament-rank';

describe('tournament rank slider', () => {
  it('drops the maximum bound at the slider ceiling', () => {
    expect(
      toRankRangeFilter({ min: RANK_RANGE_MIN, max: RANK_RANGE_MAX })
    ).toEqual({
      minRankRange: RANK_RANGE_MIN,
      maxRankRange: undefined,
    });
    expect(toRankRangeFilter({ min: 5_000, max: 250_000 })).toEqual({
      minRankRange: 5_000,
      maxRankRange: 250_000,
    });
    expect(toRankRangeFilter({})).toEqual({
      minRankRange: undefined,
      maxRankRange: undefined,
    });
  });

  it('treats an unset maximum as no rank filter', () => {
    expect(hasRankRangeFilter({})).toBe(false);
    expect(hasRankRangeFilter({ minRankRange: RANK_RANGE_MIN })).toBe(false);
    expect(hasRankRangeFilter({ maxRankRange: RANK_RANGE_MAX })).toBe(false);
    expect(hasRankRangeFilter({ maxRankRange: 250_000 })).toBe(true);
    expect(hasRankRangeFilter({ minRankRange: 5_000 })).toBe(true);
  });

  it('uses the requested step at each increasing threshold', () => {
    expect(moveRankBySliderStops(999, 1)).toBe(1_000);
    expect(moveRankBySliderStops(1_000, 1)).toBe(1_100);
    expect(moveRankBySliderStops(5_000, 1)).toBe(5_500);
    expect(moveRankBySliderStops(10_000, 1)).toBe(11_000);
    expect(moveRankBySliderStops(11_000, 1)).toBe(12_000);
  });

  it('reverses cleanly across each threshold', () => {
    expect(moveRankBySliderStops(1_000, -1)).toBe(999);
    expect(moveRankBySliderStops(1_100, -1)).toBe(1_000);
    expect(moveRankBySliderStops(5_500, -1)).toBe(5_000);
    expect(moveRankBySliderStops(11_000, -1)).toBe(10_000);
  });

  it('moves ten stops across tier boundaries', () => {
    expect(moveRankBySliderStops(995, 10)).toBe(1_500);
    expect(moveRankBySliderStops(1_500, -10)).toBe(995);
  });

  it('moves off-grid values to the adjacent canonical stop', () => {
    expect(moveRankBySliderStops(1_001, -1)).toBe(1_000);
    expect(moveRankBySliderStops(1_001, 1)).toBe(1_100);
    expect(moveRankBySliderStops(5_250, -1)).toBe(5_000);
    expect(moveRankBySliderStops(5_250, 1)).toBe(5_500);
    expect(moveRankBySliderStops(10_500, -1)).toBe(10_000);
    expect(moveRankBySliderStops(10_500, 1)).toBe(11_000);
  });

  it('snaps pointer values to the nearest stop and resolves ties upward', () => {
    expect(snapRankToSliderStop(1_049)).toBe(1_000);
    expect(snapRankToSliderStop(1_050)).toBe(1_100);
    expect(snapRankToSliderStop(5_249)).toBe(5_000);
    expect(snapRankToSliderStop(5_250)).toBe(5_500);
    expect(snapRankToSliderStop(10_499)).toBe(10_000);
    expect(snapRankToSliderStop(10_500)).toBe(11_000);
    expect(snapRankToSliderStop(999_499)).toBe(999_000);
    expect(snapRankToSliderStop(999_500)).toBe(1_000_000);
  });

  it('round-trips every tier boundary', () => {
    const ranks = [
      1,
      1_000,
      1_100,
      5_000,
      5_500,
      10_000,
      11_000,
      RANK_RANGE_MAX,
    ];

    for (const rank of ranks) {
      expect(sliderPositionToRank(rankToSliderPosition(rank))).toBe(rank);
    }
  });

  it('clamps movement and positions to the supported range', () => {
    expect(moveRankBySliderStops(1, -1)).toBe(1);
    expect(moveRankBySliderStops(RANK_RANGE_MAX, 1)).toBe(RANK_RANGE_MAX);
    expect(sliderPositionToRank(-1)).toBe(1);
    expect(sliderPositionToRank(RANK_SLIDER_MAX + 1)).toBe(RANK_RANGE_MAX);
    expect(rankToSliderPosition(0)).toBe(0);
    expect(rankToSliderPosition(RANK_RANGE_MAX + 1)).toBe(RANK_SLIDER_MAX);
  });

  it('exposes the ported functions as a NumericScale', () => {
    expect(tournamentRankScale.min).toBe(1);
    expect(tournamentRankScale.max).toBe(RANK_RANGE_MAX);
    expect(tournamentRankScale.snap(1_050)).toBe(snapRankToSliderStop(1_050));
    expect(tournamentRankScale.toPosition(1_000)).toBe(
      rankToSliderPosition(1_000)
    );
    expect(tournamentRankScale.fromPosition(50)).toBe(sliderPositionToRank(50));
    expect(tournamentRankScale.step(1_000, 1)).toBe(
      moveRankBySliderStops(1_000, 1)
    );
  });

  it('stays logarithmic rather than proportional to stop index', () => {
    // Locks the decision not to rebuild rank on `tieredScale`: the stop-index
    // mapping moves rank 1,000 off the midpoint and inflates the 11k-1M band.
    const indexScale = tieredScale({
      tiers: [
        { start: 1, end: 1_000, step: 1 },
        { start: 1_100, end: 5_000, step: 100 },
        { start: 5_500, end: 10_000, step: 500 },
        { start: 11_000, end: RANK_RANGE_MAX, step: 1_000 },
      ],
    });

    expect(rankToSliderPosition(1_000)).toBe(50);
    expect(indexScale.toPosition(1_000)).toBeCloseTo(48.995, 3);
    expect(RANK_SLIDER_MAX - rankToSliderPosition(11_000)).toBeCloseTo(32.6, 1);
    expect(RANK_SLIDER_MAX - indexScale.toPosition(11_000)).toBeCloseTo(
      48.5,
      1
    );
  });
});

import { describe, expect, it } from 'bun:test';

import {
  RANK_RANGE_DEFAULT_MAX,
  RANK_RANGE_MAX,
  RANK_SLIDER_MAX,
  moveRankBySliderStops,
  rankToSliderPosition,
  sliderPositionToRank,
  snapRankToSliderStop,
} from '../tournamentRankSlider';

describe('tournament rank slider', () => {
  it('keeps the default below the slider ceiling', () => {
    expect(RANK_RANGE_DEFAULT_MAX).toBe(200_000);
    expect(RANK_RANGE_MAX).toBeGreaterThan(RANK_RANGE_DEFAULT_MAX);
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
});

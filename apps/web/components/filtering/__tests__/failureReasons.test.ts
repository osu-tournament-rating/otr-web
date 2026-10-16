import { describe, expect, it } from 'bun:test';
import { FilteringFailReason } from '@otr/core/osu';

import { getFailureReasons } from '../FailureReasonsBadges';

describe('getFailureReasons', () => {
  it('names the rating bounds a player failed', () => {
    expect(getFailureReasons(FilteringFailReason.MinRating)).toEqual([
      'Low rating',
    ]);
    expect(
      getFailureReasons(
        FilteringFailReason.MinRating | FilteringFailReason.MaxRating
      )
    ).toEqual(['Low rating', 'High rating']);
  });

  it('leaves out reasons the tool cannot set', () => {
    expect(
      getFailureReasons(
        FilteringFailReason.MaxRating |
          FilteringFailReason.NotEnoughTournaments |
          FilteringFailReason.PeakRatingTooHigh
      )
    ).toEqual(['High rating']);
  });

  it('gives nothing for a passing player', () => {
    expect(getFailureReasons(FilteringFailReason.None)).toEqual([]);
    expect(getFailureReasons(null)).toEqual([]);
    expect(getFailureReasons(undefined)).toEqual([]);
  });
});

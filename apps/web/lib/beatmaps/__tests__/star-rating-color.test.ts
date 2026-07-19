import { describe, expect, test } from 'bun:test';

import { getStarRatingColor } from '../star-rating-color';

describe('star rating color', () => {
  test('uses every exact color stop from the reference spectrum', () => {
    expect(
      [0, 1.25, 2, 2.5, 3.3, 4.2, 4.9, 5.8, 6.7, 7.7, 9].map(getStarRatingColor)
    ).toEqual([
      'rgb(66 144 255)',
      'rgb(79 192 255)',
      'rgb(79 255 213)',
      'rgb(124 255 79)',
      'rgb(246 240 92)',
      'rgb(255 128 104)',
      'rgb(255 78 111)',
      'rgb(198 69 184)',
      'rgb(101 99 222)',
      'rgb(24 21 142)',
      'rgb(0 0 0)',
    ]);
  });

  test('interpolates colors between adjacent stops', () => {
    expect(getStarRatingColor(1)).toBe('rgb(76 182 255)');
    expect(getStarRatingColor(3)).toBe('rgb(200 246 87)');
    expect(getStarRatingColor(8)).toBe('rgb(18 16 109)');
  });

  test('clamps invalid and out-of-range ratings to the spectrum', () => {
    expect(getStarRatingColor(Number.NaN)).toBe('rgb(66 144 255)');
    expect(getStarRatingColor(-1)).toBe('rgb(66 144 255)');
    expect(getStarRatingColor(10)).toBe('rgb(0 0 0)');
  });
});

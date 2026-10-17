import { describe, expect, test } from 'bun:test';

import {
  getStarRatingColor,
  getStarRatingForegroundColor,
} from '../star-rating-color';

describe('star rating color', () => {
  test('uses every exact color stop from the reference spectrum', () => {
    expect(
      [0.1, 1.25, 2, 2.5, 3.3, 4.2, 4.9, 5.8, 6.7, 7.7, 9].map(
        getStarRatingColor
      )
    ).toEqual([
      'rgb(66, 144, 251)',
      'rgb(79, 192, 255)',
      'rgb(79, 255, 213)',
      'rgb(124, 255, 79)',
      'rgb(246, 240, 92)',
      'rgb(255, 128, 104)',
      'rgb(255, 78, 111)',
      'rgb(198, 69, 184)',
      'rgb(101, 99, 222)',
      'rgb(24, 21, 142)',
      '#000000',
    ]);
  });

  test('interpolates colors with osu! gamma-corrected RGB', () => {
    expect(getStarRatingColor(1)).toBe('rgb(76, 183, 254)');
    expect(getStarRatingColor(3)).toBe('rgb(210, 246, 87)');
    expect(getStarRatingColor(8)).toBe('rgb(21, 19, 126)');
  });

  test('uses osu! endpoint colors outside the interpolated spectrum', () => {
    expect(getStarRatingColor(Number.NaN)).toBe('#AAAAAA');
    expect(getStarRatingColor(-1)).toBe('#AAAAAA');
    expect(getStarRatingColor(0.09)).toBe('#AAAAAA');
    expect(getStarRatingColor(9)).toBe('#000000');
    expect(getStarRatingColor(10)).toBe('#000000');
    expect(getStarRatingColor(Number.POSITIVE_INFINITY)).toBe('#000000');
  });

  test('chooses a neutral foreground with stronger contrast', () => {
    expect(getStarRatingForegroundColor(0)).toBe('#000000');
    expect(getStarRatingForegroundColor(3)).toBe('#000000');
    expect(getStarRatingForegroundColor(6.5)).toBe('#FFFFFF');
    expect(getStarRatingForegroundColor(9)).toBe('#FFFFFF');
  });
});

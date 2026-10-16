import { getStarRatingColor } from '@/lib/beatmaps/star-rating-color';

import {
  CONTRAST_MARK,
  contrastRatio,
  oklabToRgb,
  parseColor,
  rgbToOklab,
  toHex,
} from './contrast';
import { SURFACES, type Theme } from './surfaces';

/**
 * osu!'s difficulty spectrum. Use it as a solid pill fill with
 * `getStarRatingForegroundColor` for the text, which always clears 4.5:1.
 */
export {
  getStarRatingColor,
  getStarRatingForegroundColor,
} from '@/lib/beatmaps/star-rating-color';

const LIGHTNESS_STEP = 0.01;

function shiftUntilVisible(color: string, theme: Theme): string {
  const surface = SURFACES[theme].muted;
  const direction = theme === 'light' ? -1 : 1;
  const { l, a, b } = rgbToOklab(parseColor(color));

  let lightness = l;
  let hex = toHex({ ...parseColor(color), alpha: 1 });

  while (
    contrastRatio(hex, surface) < CONTRAST_MARK &&
    lightness >= 0 &&
    lightness <= 1
  ) {
    lightness += direction * LIGHTNESS_STEP;
    hex = toHex({ ...oklabToRgb(lightness, a, b), alpha: 1 });
  }

  return hex;
}

/**
 * The spectrum colour stepped darker for light cards and lighter for dark
 * ones, so a star icon or chart mark clears 3:1 in each theme while keeping
 * its hue.
 */
export function getStarRatingMarkColors(starRating: number): {
  light: string;
  dark: string;
} {
  const color = getStarRatingColor(starRating);

  return {
    light: shiftUntilVisible(color, 'light'),
    dark: shiftUntilVisible(color, 'dark'),
  };
}

/**
 * A star-rating colour for icons, text tints and chart marks on a card. It
 * returns `light-dark()`, which follows the theme's `color-scheme`.
 */
export function getStarRatingMarkColor(starRating: number): string {
  const { light, dark } = getStarRatingMarkColors(starRating);
  return `light-dark(${light}, ${dark})`;
}

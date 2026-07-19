import { interpolateRgb } from 'd3-interpolate';
import { scaleLinear } from 'd3-scale';

const difficultyColourSpectrum = scaleLinear<string>()
  .domain([0.1, 1.25, 2, 2.5, 3.3, 4.2, 4.9, 5.8, 6.7, 7.7, 9])
  .clamp(true)
  .range([
    '#4290FB',
    '#4FC0FF',
    '#4FFFD5',
    '#7CFF4F',
    '#F6F05C',
    '#FF8068',
    '#FF4E6F',
    '#C645B8',
    '#6563DE',
    '#18158E',
    '#000000',
  ])
  .interpolate(interpolateRgb.gamma(2.2));

type RgbColor = readonly [red: number, green: number, blue: number];

const LOWEST_DIFFICULTY_COLOR = '#AAAAAA';
const HIGHEST_DIFFICULTY_COLOR = '#000000';
const DARK_FOREGROUND = '#000000';
const LIGHT_FOREGROUND = '#FFFFFF';
const FOREGROUND_LUMINANCE_THRESHOLD = 0.179;

function parseCssColor(color: string): RgbColor {
  if (color.startsWith('#')) {
    return [
      Number.parseInt(color.slice(1, 3), 16),
      Number.parseInt(color.slice(3, 5), 16),
      Number.parseInt(color.slice(5, 7), 16),
    ];
  }

  const channels = color
    .match(/[\d.]+/g)
    ?.slice(0, 3)
    .map(Number);
  if (channels?.length !== 3) {
    throw new Error(`Unsupported star rating color: ${color}`);
  }

  const [red, green, blue] = channels;
  return [red, green, blue];
}

function relativeLuminance(color: RgbColor): number {
  const [red, green, blue] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * Returns the osu! difficulty-spectrum color for a star rating.
 * Mirrors osu!'s gray below 0.1, gamma-corrected spectrum, and black at 9+.
 */
export function getStarRatingColor(starRating: number): string {
  const normalizedRating = Number.isNaN(starRating) ? 0 : starRating;

  if (normalizedRating < 0.1) return LOWEST_DIFFICULTY_COLOR;
  if (normalizedRating >= 9) return HIGHEST_DIFFICULTY_COLOR;

  return difficultyColourSpectrum(normalizedRating);
}

/** Returns whichever neutral foreground has stronger contrast on the pill. */
export function getStarRatingForegroundColor(starRating: number): string {
  const background = parseCssColor(getStarRatingColor(starRating));

  return relativeLuminance(background) > FOREGROUND_LUMINANCE_THRESHOLD
    ? DARK_FOREGROUND
    : LIGHT_FOREGROUND;
}

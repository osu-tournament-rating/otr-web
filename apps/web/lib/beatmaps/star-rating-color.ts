type RgbColor = readonly [red: number, green: number, blue: number];

interface StarRatingColorStop {
  rating: number;
  color: RgbColor;
}

/** Color stops extracted from the osu! star-rating spectrum. */
const STAR_RATING_COLOR_STOPS: readonly StarRatingColorStop[] = [
  { rating: 0, color: [66, 144, 255] },
  { rating: 1.25, color: [79, 192, 255] },
  { rating: 2, color: [79, 255, 213] },
  { rating: 2.5, color: [124, 255, 79] },
  { rating: 3.3, color: [246, 240, 92] },
  { rating: 4.2, color: [255, 128, 104] },
  { rating: 4.9, color: [255, 78, 111] },
  { rating: 5.8, color: [198, 69, 184] },
  { rating: 6.7, color: [101, 99, 222] },
  { rating: 7.7, color: [24, 21, 142] },
  { rating: 9, color: [0, 0, 0] },
];

function formatRgb(color: RgbColor): string {
  return `rgb(${color.join(' ')})`;
}

function interpolateColor(
  start: RgbColor,
  end: RgbColor,
  progress: number
): RgbColor {
  const interpolateChannel = (index: number) =>
    Math.round(start[index] + (end[index] - start[index]) * progress);

  return [interpolateChannel(0), interpolateChannel(1), interpolateChannel(2)];
}

/**
 * Returns the color at a star rating's position in the difficulty spectrum.
 * Ratings outside the spectrum are clamped to its nearest endpoint.
 */
export function getStarRatingColor(starRating: number): string {
  const normalizedRating = Number.isNaN(starRating)
    ? 0
    : Math.max(starRating, 0);
  const upperStopIndex = STAR_RATING_COLOR_STOPS.findIndex(
    ({ rating }) => normalizedRating <= rating
  );

  if (upperStopIndex === -1) {
    return formatRgb(
      STAR_RATING_COLOR_STOPS[STAR_RATING_COLOR_STOPS.length - 1].color
    );
  }

  if (upperStopIndex === 0) {
    return formatRgb(STAR_RATING_COLOR_STOPS[0].color);
  }

  const lowerStop = STAR_RATING_COLOR_STOPS[upperStopIndex - 1];
  const upperStop = STAR_RATING_COLOR_STOPS[upperStopIndex];
  const progress =
    (normalizedRating - lowerStop.rating) /
    (upperStop.rating - lowerStop.rating);

  return formatRgb(
    interpolateColor(lowerStop.color, upperStop.color, progress)
  );
}

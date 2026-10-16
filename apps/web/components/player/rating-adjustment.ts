import { RatingAdjustmentType } from '@otr/core/osu';

/** Sentence-case names for the kinds of rating adjustment. */
export const RATING_ADJUSTMENT_TYPE_LABELS: Readonly<
  Record<RatingAdjustmentType, string>
> = {
  [RatingAdjustmentType.Initial]: 'Initial',
  [RatingAdjustmentType.Decay]: 'Decay',
  [RatingAdjustmentType.Match]: 'Match',
  [RatingAdjustmentType.VolatilityDecay]: 'Volatility decay',
};

/** The two values the rating history can chart. */
export type RatingMetric = 'rating' | 'volatility';

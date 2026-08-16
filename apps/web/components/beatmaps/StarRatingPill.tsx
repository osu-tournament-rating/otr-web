import { Star } from 'lucide-react';

import {
  beatmapPillVariants,
  type BeatmapPillVariants,
} from '@/components/beatmaps/pill';
import { Badge } from '@/components/ui/badge';
import {
  getStarRatingColor,
  getStarRatingForegroundColor,
} from '@/lib/beatmaps/star-rating-color';
import { cn } from '@/lib/utils';

interface StarRatingPillProps extends Omit<BeatmapPillVariants, 'tone'> {
  starRating: number;
  className?: string;
  valueClassName?: string;
  testId?: string;
}

/** The fill encodes difficulty on osu!'s star-rating spectrum. */
export default function StarRatingPill({
  starRating,
  size,
  className,
  valueClassName,
  testId = 'beatmap-star-rating',
}: StarRatingPillProps) {
  const formattedRating = starRating.toFixed(2);

  return (
    <Badge
      data-testid={testId}
      aria-label={`${formattedRating} star rating`}
      style={{
        backgroundColor: getStarRatingColor(starRating),
        color: getStarRatingForegroundColor(starRating),
      }}
      className={cn(
        beatmapPillVariants({ size, tone: 'plain' }),
        'border-current/20',
        className
      )}
    >
      <Star className="fill-current" aria-hidden="true" />
      <span
        data-testid={testId ? `${testId}-value` : undefined}
        className={cn('font-medium', valueClassName)}
      >
        {formattedRating}
      </span>
    </Badge>
  );
}

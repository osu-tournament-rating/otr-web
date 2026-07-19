import { Star, type LucideProps } from 'lucide-react';

import { getStarRatingColor } from '@/lib/beatmaps/star-rating-color';

interface StarRatingIconProps extends LucideProps {
  starRating: number;
}

export default function StarRatingIcon({
  className,
  starRating,
  style,
  strokeWidth = 2.5,
  ...props
}: StarRatingIconProps) {
  const color = getStarRatingColor(starRating);

  return (
    <Star
      {...props}
      className={className}
      strokeWidth={strokeWidth}
      style={{
        ...style,
        color,
        fill: color,
      }}
    />
  );
}

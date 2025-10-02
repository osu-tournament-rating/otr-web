'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useMemo } from 'react';

const RATING_PRECISION = {
  DELTA: 1,
  COMPARISON: 10,
} as const;

const RATING_THRESHOLDS = {
  HIGH: 20,
} as const;

function getRatingChangeColor(delta: number | null): string {
  if (delta === null) return 'text-muted-foreground';

  const roundedDelta = Math.round(delta * 10) / 10;
  if (roundedDelta === 0) return 'text-gray-500';

  if (delta > 0) {
    return delta > RATING_THRESHOLDS.HIGH
      ? 'text-green-500'
      : 'text-green-500/80';
  }
  return delta < -RATING_THRESHOLDS.HIGH ? 'text-red-500' : 'text-red-500/80';
}

interface RatingDeltaProps {
  delta: number;
  className?: string;
  hideIcon?: boolean;
}

export default function RatingDelta({
  delta,
  className,
  hideIcon,
}: RatingDeltaProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center gap-0.5 rounded-md px-1 py-0.5 text-xs font-semibold sm:gap-1 sm:px-1.5',
        Math.round(delta * RATING_PRECISION.COMPARISON) /
          RATING_PRECISION.COMPARISON >
          0 && 'bg-green-500/10',
        Math.round(delta * RATING_PRECISION.COMPARISON) /
          RATING_PRECISION.COMPARISON <
          0 && 'bg-red-500/10',
        Math.round(delta * RATING_PRECISION.COMPARISON) /
          RATING_PRECISION.COMPARISON ===
          0 && 'bg-gray-500/10',
        getRatingChangeColor(delta),
        className
      )}
    >
      {useMemo(() => {
        const roundedDelta =
          Math.round(delta * RATING_PRECISION.COMPARISON) /
          RATING_PRECISION.COMPARISON;

        const icon =
          roundedDelta === 0 ? (
            <Minus className="h-3.5 w-3.5" />
          ) : delta > 0 ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          );

        return (
          <>
            {!hideIcon && <span className="hidden sm:inline">{icon}</span>}
            <span>
              {Math.abs(delta) < 0.05
                ? '0.0'
                : (delta > 0 ? '+' : '') +
                  delta.toFixed(RATING_PRECISION.DELTA)}
            </span>
          </>
        );
      }, [delta, hideIcon])}
    </div>
  );
}

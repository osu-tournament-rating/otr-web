import { RatingDelta } from '@/components/kit/format/RatingDelta';
import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';
import { sortData } from '@/lib/utils/playerRatingChart';

import type { RatingMetric } from './rating-adjustment';

/**
 * The change across the charted points: the last value less the first, so
 * a time range shows the change within it.
 */
export default function PlayerRatingChartSummaryStats({
  data,
  metric,
  rangeLabel,
}: {
  data: PlayerRatingAdjustment[];
  metric: RatingMetric;
  /** Said after the change when a time range narrows the chart. */
  rangeLabel?: string;
}) {
  if (data.length === 0) return null;

  const sorted = sortData(data, false);
  const valueOf = (point: PlayerRatingAdjustment) =>
    metric === 'rating' ? point.ratingAfter : point.volatilityAfter;
  const totalChange = valueOf(sorted[sorted.length - 1]) - valueOf(sorted[0]);

  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      Total change
      <RatingDelta
        value={totalChange}
        lowerIsBetter={metric === 'volatility'}
      />
      {rangeLabel ? <span className="text-xs">{rangeLabel}</span> : null}
    </p>
  );
}

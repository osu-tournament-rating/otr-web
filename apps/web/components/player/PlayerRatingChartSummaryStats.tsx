import { TrendingUp, TrendingDown } from 'lucide-react';
import TRText from '../rating/TRText';
import { sortData } from '@/lib/utils/playerRatingChart';
import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';

interface PlayerRatingChartSummaryStatsProps {
  data: PlayerRatingAdjustment[];
  /** Optional suffix shown when a time filter narrows the change window */
  rangeLabel?: string;
}

export default function PlayerRatingChartSummaryStats({
  data,
  rangeLabel,
}: PlayerRatingChartSummaryStatsProps) {
  if (data.length === 0) return null;

  const sortedData = sortData(data, false);
  const currentRating = sortedData[sortedData.length - 1]?.ratingAfter || 0;
  const initialRating = sortedData[0]?.ratingAfter || 0;
  const totalChange = currentRating - initialRating;
  const isPositive = totalChange >= 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Total Change</span>
      <span
        className={`flex items-center gap-1 font-semibold ${
          isPositive ? 'text-success' : 'text-destructive'
        }`}
        aria-label={`Total change ${isPositive ? 'up' : 'down'} ${Math.abs(
          totalChange
        ).toFixed(0)} TR`}
      >
        {isPositive ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span className="flex items-baseline gap-1">
          {isPositive ? '+' : ''}
          {totalChange.toFixed(0)}
          <TRText />
        </span>
      </span>
      {rangeLabel && (
        <span className="text-xs text-muted-foreground">{rangeLabel}</span>
      )}
    </div>
  );
}

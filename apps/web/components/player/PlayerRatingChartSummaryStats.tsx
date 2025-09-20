import { TrendingUp, TrendingDown } from 'lucide-react';
import TRText from '../rating/TRText';
import { sortData } from '@/lib/utils/playerRatingChart';
import StatCard from '../shared/StatCard';
import TierIcon from '../icons/TierIcon';
import { getTierFromRating } from '@/lib/utils/tierData';
import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerDashboard';

interface PlayerRatingChartSummaryStatsProps {
  data: PlayerRatingAdjustment[];
  highestRating: number | undefined;
}

export default function PlayerRatingChartSummaryStats({
  data,
  highestRating,
}: PlayerRatingChartSummaryStatsProps) {
  if (data.length === 0) return null;

  const sortedData = sortData(data, false);
  const currentRating = sortedData[sortedData.length - 1]?.ratingAfter || 0;
  const initialRating = sortedData[0]?.ratingAfter || 0;
  const totalChange = currentRating - initialRating;

  const { tier, subTier } = getTierFromRating(highestRating ?? 0);

  return (
    <div className="flex flex-wrap gap-2">
      <StatCard
        icon={
          <TierIcon
            tier={tier}
            subTier={subTier}
            width={28}
            height={28}
            tooltip
          />
        }
        label="Peak Rating"
        value={
          <span className="flex items-baseline gap-1">
            {highestRating?.toFixed(0) ?? 'N/A'}
            <TRText />
          </span>
        }
        className="min-w-[150px] flex-1 gap-2 rounded-xl"
        valueClassName="text-xl"
      />
      <StatCard
        icon={
          totalChange >= 0 ? (
            <TrendingUp className="h-6 w-6" />
          ) : (
            <TrendingDown className="h-6 w-6" />
          )
        }
        label="Total Change"
        value={
          <span className="flex items-baseline gap-1">
            {totalChange > 0 ? '+' : ''}
            {totalChange.toFixed(0)}
            <TRText />
          </span>
        }
        className="min-w-[150px] flex-1 gap-2 rounded-xl"
        valueClassName={`text-xl ${totalChange >= 0 ? 'text-success' : 'text-destructive'}`}
      />
    </div>
  );
}

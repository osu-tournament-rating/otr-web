import { TrendingUp, TrendingDown, Award } from 'lucide-react';
import { RatingAdjustmentDTO } from '@osu-tournament-rating/otr-api-client';
import { Card } from '../ui/card';
import TRText from '../rating/TRText';
import { sortData } from '@/lib/utils/playerRatingChart';

interface PlayerRatingChartSummaryStatsProps {
  data: RatingAdjustmentDTO[];
  highestRating: number;
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

  return (
    <div className="flex flex-wrap gap-2">
      <Card className="min-w-[180px] flex-1 flex-row items-center gap-2 rounded-xl border-none bg-popover p-4">
        <Award className="h-6 w-6 text-primary" />
        <div>
          <div className="text-sm text-muted-foreground">Peak Rating</div>
          <div className="flex items-baseline gap-1 text-xl font-semibold">
            {highestRating.toFixed(0)}
            <TRText />
          </div>
        </div>
      </Card>
      <Card className="min-w-[180px] flex-1 flex-row items-center gap-2 rounded-xl border-none bg-popover p-4">
        {totalChange >= 0 ? (
          <TrendingUp className="h-6 w-6 text-primary" />
        ) : (
          <TrendingDown className="h-6 w-6 text-primary" />
        )}
        <div>
          <div className="text-sm text-muted-foreground">Total Change</div>
          <div
            className={`flex flex-row items-baseline gap-1 text-xl font-semibold ${totalChange >= 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            {totalChange > 0 ? '+' : ''}
            {totalChange.toFixed(0)}
            <TRText />
          </div>
        </div>
      </Card>
    </div>
  );
}

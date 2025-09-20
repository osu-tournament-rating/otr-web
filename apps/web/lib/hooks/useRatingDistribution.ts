import { useMemo } from 'react';
import {
  getTierColor,
  tierData as baseTierData,
  TierDataType as BaseTierDataType,
} from '@/lib/utils/tierData';
import { CHART_CONSTANTS } from '@/lib/utils/chart';

type TierDataType = BaseTierDataType & {
  short: string;
  color: string;
};

type ChartDataType = {
  rating: number;
  count: number;
  tier?: TierDataType;
  cumulativePercentage?: number;
};

const getTierData = (): TierDataType[] => {
  return baseTierData.map((t) => {
    const tierColor = getTierColor(t.tier);
    const cssVarName = tierColor ? `--${tierColor.textClass}` : '--primary';

    return {
      ...t,
      short: t.displayName,
      color: `var(${cssVarName})`,
    };
  });
};

interface UseRatingDistributionProps {
  ratings: Record<string, number>;
}

export function useRatingDistribution({ ratings }: UseRatingDistributionProps) {
  return useMemo(() => {
    const tierData = getTierData();

    const ratingNumbers = Object.keys(ratings)
      .map((r) => parseInt(r, 10))
      .filter((r) => !isNaN(r));

    if (ratingNumbers.length === 0) {
      return {
        chartData: [],
        tierData,
        isEmpty: true,
        totalPlayers: 0,
      };
    }

    const minRating = Math.min(...ratingNumbers);
    const maxRating = Math.max(...ratingNumbers);

    // Create complete rating buckets
    const completeRatings: Record<number, number> = {};
    for (
      let rating =
        Math.floor(minRating / CHART_CONSTANTS.BUCKET_SIZE) *
        CHART_CONSTANTS.BUCKET_SIZE;
      rating <= maxRating;
      rating += CHART_CONSTANTS.BUCKET_SIZE
    ) {
      completeRatings[rating] = ratings[rating.toString()] || 0;
    }

    // Create chart data with tier information
    const chartData: ChartDataType[] = Object.entries(completeRatings).map(
      ([rating, count]) => {
        const ratingNum = parseInt(rating, 10);
        const tier = tierData.find(
          (t, i) =>
            ratingNum >= t.baseRating &&
            (tierData[i + 1] ? ratingNum < tierData[i + 1].baseRating : true)
        );
        return { rating: ratingNum, count, tier };
      }
    );

    // Calculate cumulative percentages
    const totalPlayers = chartData.reduce((sum, item) => sum + item.count, 0);
    let cumulativeCount = 0;
    const completeChartData = chartData.map((data) => {
      cumulativeCount += data.count;
      return {
        ...data,
        cumulativePercentage:
          totalPlayers > 0 ? (cumulativeCount / totalPlayers) * 100 : 0,
      };
    });

    return {
      chartData: completeChartData,
      tierData,
      isEmpty: false,
      totalPlayers,
    };
  }, [ratings]);
}

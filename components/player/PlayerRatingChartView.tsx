import { format } from 'date-fns';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
  DotProps,
  Legend,
} from 'recharts';
import {
  RatingAdjustmentDTO,
  RatingAdjustmentType,
} from '@osu-tournament-rating/otr-api-client';
import PlayerRatingChartTooltip from './PlayerRatingChartTooltip';
import { capitalize } from '@/lib/utils';
import { sortData, ChartDataPoint } from '@/lib/utils/playerRatingChart';

interface ChartColors {
  rating: string;
  volatility: string;
  grid: string;
  text: string;
  background: string;
}

interface PlayerRatingChartViewProps {
  data: RatingAdjustmentDTO[];
  activeTab: 'rating' | 'volatility';
  highestRating: number;
  theme?: string;
}

function getChartColors(theme?: string): ChartColors {
  return {
    rating: '#3b82f6', // blue-500
    volatility: '#8b5cf6', // violet-500
    grid: theme === 'dark' ? '#374151' : '#e5e7eb', // gray-700 : gray-200
    text: theme === 'dark' ? '#d1d5db' : '#4b5563', // gray-300 : gray-600
    background: theme === 'dark' ? '#1f2937' : '#f9fafb', // gray-800 : gray-50
  };
}

export default function PlayerRatingChartView({
  data,
  activeTab,
  highestRating,
  theme,
}: PlayerRatingChartViewProps) {
  if (!data || !data.length) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        No data available
      </div>
    );
  }

  const chartColors = getChartColors(theme);

  const chartData: ChartDataPoint[] = sortData(data, false).map(
    (adjustment) => ({
      ...adjustment,
      formattedAxisDate: format(adjustment.timestamp, "MMM ''yy"),
    })
  );

  const renderActiveDot = (props: DotProps) => {
    if (props === undefined) {
      return <circle cx={0} cy={0} r={0} fill="transparent" opacity={0} />;
    }

    const { cx, cy } = props;
    const payload = (props as { payload?: RatingAdjustmentDTO }).payload;

    if (
      !payload ||
      payload.adjustmentType !== RatingAdjustmentType.Match ||
      !payload.match?.id
    ) {
      return <circle cx={cx} cy={cy} r={0} fill="transparent" opacity={0} />;
    }

    return (
      <Link href={`/matches/${payload.match?.id}`}>
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={
            activeTab === 'rating' ? chartColors.rating : chartColors.volatility
          }
          stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
        />
      </Link>
    );
  };

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%" minWidth={300}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            dataKey="formattedAxisDate"
            stroke={chartColors.text}
            tick={{ fill: chartColors.text }}
            tickLine={{ stroke: chartColors.grid }}
            minTickGap={50}
            fontFamily="sans-serif"
          />
          <YAxis
            stroke={chartColors.text}
            tick={{ fill: chartColors.text }}
            tickLine={{ stroke: chartColors.grid }}
            domain={
              activeTab === 'rating'
                ? ['auto', 'auto']
                : [
                    (dataMin: number) => Math.max(0, dataMin - 25),
                    'auto' as const,
                  ]
            }
          />
          <RechartsTooltip
            content={<PlayerRatingChartTooltip activeTab={activeTab} />}
          />
          <Legend />
          {activeTab === 'rating' && (
            <ReferenceLine
              y={highestRating}
              label={{
                value: 'Peak',
                position: 'insideTopLeft',
                fill: chartColors.text,
              }}
              stroke="#8884d8"
              strokeDasharray="3 3"
            />
          )}
          <Line
            type="natural"
            dataKey={`${activeTab}After`}
            stroke={
              activeTab === 'rating'
                ? chartColors.rating
                : chartColors.volatility
            }
            strokeWidth={2}
            name={capitalize(activeTab)}
            dot={false}
            activeDot={renderActiveDot}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

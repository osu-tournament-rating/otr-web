import { format } from 'date-fns';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  DotProps,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import PlayerRatingChartTooltip from './PlayerRatingChartTooltip';
import { capitalize } from '@/lib/utils';
import { ChartContainer } from '../ui/chart';
import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerDashboard';
import { RatingAdjustmentType } from '@/lib/osu/enums';

const CHART_CONSTANTS = {
  MIN_DATA_POINTS: 2,
  Y_AXIS_TARGET_TICKS: 5,
  X_AXIS_TARGET_TICKS: 6,
  ACTIVE_DOT_RADIUS: 6,
  LINE_WIDTH: 2,
  Y_AXIS_WIDTH: 45,
  Y_PADDING_MAGNITUDE: 5,
} as const;

interface ChartColors {
  rating: string;
  volatility: string;
  grid: string;
  text: string;
  background: string;
}

interface PlayerRatingChartViewProps {
  data: PlayerRatingAdjustment[];
  activeTab: 'rating' | 'volatility';
  highestRating: number | undefined;
  theme?: string;
}

interface ChartDataPoint extends PlayerRatingAdjustment {
  timestampValue: number;
}

/**
 * Returns chart color configuration based on the current theme.
 */
const getChartColors = (theme?: string): ChartColors => ({
  rating: '#3b82f6',
  volatility: '#8b5cf6',
  grid: theme === 'dark' ? 'rgba(55, 65, 81, 0.4)' : 'rgba(156, 163, 175, 0.4)',
  text: theme === 'dark' ? '#d1d5db' : '#4b5563',
  background: theme === 'dark' ? '#1f2937' : '#f9fafb',
});

/**
 * Calculates a human-readable interval for axis ticks based on the rough interval.
 * Rounds to common intervals like 1, 2, 2.5, 5, 10, 20, 25, 50, 100, etc.
 */
const calculateReadableTickInterval = (roughInterval: number): number => {
  const magnitude = Math.pow(
    CHART_CONSTANTS.Y_PADDING_MAGNITUDE,
    Math.floor(Math.log10(roughInterval))
  );
  const normalizedValue = roughInterval / magnitude;

  let readableInterval: number;
  if (normalizedValue <= 1) readableInterval = magnitude;
  else if (normalizedValue <= 2) readableInterval = 2 * magnitude;
  else if (normalizedValue <= 2.5) readableInterval = 2.5 * magnitude;
  else if (normalizedValue <= 5) readableInterval = 5 * magnitude;
  else readableInterval = 10 * magnitude;

  return readableInterval < 1 ? 1 : Math.round(readableInterval);
};

/**
 * Calculates human-readable Y-axis bounds with evenly spaced tick intervals.
 * @returns Object with domain bounds and tick values
 */
const calculateReadableYAxisBounds = (
  data: ChartDataPoint[],
  activeTab: 'rating' | 'volatility'
): { domain: [number, number]; ticks: number[] } => {
  // Extract all values for the selected metric (rating or volatility)
  const metricValues = data.map((dataPoint) => dataPoint[`${activeTab}After`]);
  const minValue = Math.min(...metricValues);
  const maxValue = Math.max(...metricValues);
  const valueRange = maxValue - minValue;

  // Calculate readable interval
  const targetTickCount = CHART_CONSTANTS.Y_AXIS_TARGET_TICKS;
  const roughInterval = valueRange / (targetTickCount - 1);
  const readableInterval = calculateReadableTickInterval(roughInterval);

  // Calculate readable bounds that align with the tick interval
  const readableMinBound =
    Math.floor(minValue / readableInterval) * readableInterval;
  const readableMaxBound =
    Math.ceil(maxValue / readableInterval) * readableInterval;

  // Generate evenly spaced tick values
  const tickValues: number[] = [];
  for (
    let tickValue = readableMinBound;
    tickValue <= readableMaxBound;
    tickValue += readableInterval
  ) {
    tickValues.push(tickValue);
  }

  return {
    domain: [readableMinBound, readableMaxBound],
    ticks: tickValues,
  };
};

/**
 * Dynamically generates ticks for the X-axis based on the time range.
 * @returns An array of timestamps for the ticks.
 */
/**
 * Generates evenly distributed X-axis tick marks across the time range.
 * Ensures consistent spacing regardless of data distribution.
 */
const generateAdaptiveTicks = (minTime: number, maxTime: number): number[] => {
  const targetTickCount = CHART_CONSTANTS.X_AXIS_TARGET_TICKS;
  const timeRange = maxTime - minTime;

  // Generate evenly spaced ticks
  const tickMarks: number[] = [];
  for (let i = 0; i < targetTickCount; i++) {
    const tickTime = minTime + (timeRange * i) / (targetTickCount - 1);
    tickMarks.push(Math.round(tickTime));
  }

  return tickMarks;
};

export default function PlayerRatingChartView({
  data,
  activeTab,
  highestRating,
  theme,
}: PlayerRatingChartViewProps) {
  if (!data || data.length < CHART_CONSTANTS.MIN_DATA_POINTS) {
    return (
      <div className="flex h-[350px] items-center justify-center">
        Not enough data to display a chart.
      </div>
    );
  }

  // Get color scheme based on current theme
  const chartColors = getChartColors(theme);

  // Transform and sort data chronologically for chart display
  const chartData: ChartDataPoint[] = [...data]
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
    .map((adjustment) => ({
      ...adjustment,
      timestampValue: new Date(adjustment.timestamp).getTime(),
    }));

  // Extract time range from the data
  const timestamps = chartData.map((dataPoint) => dataPoint.timestampValue);
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);

  const chartConfig = {
    rating: {
      label: 'Rating',
      color: chartColors.rating,
    },
    volatility: {
      label: 'Volatility',
      color: chartColors.volatility,
    },
  };

  const xAxisTickMarks = generateAdaptiveTicks(minTime, maxTime);

  /**
   * Formats X-axis tick labels based on the time range.
   * Uses adaptive formatting to ensure readability across different time spans.
   */
  const formatXAxisTick = (tickTimestamp: number) => {
    const tickDate = new Date(tickTimestamp);
    const timeRange = maxTime - minTime;
    const dayRange = timeRange / (1000 * 60 * 60 * 24); // Convert to days

    // Use different formats based on the total time range
    if (dayRange <= 365) {
      // Up to a year: show month, day and year
      return format(tickDate, 'MMM d, yyyy');
    } else {
      // More than a year: show month and year
      return format(tickDate, 'MMM yyyy');
    }
  };

  /**
   * Renders clickable dots for match data points on the chart.
   * Only renders for actual matches (not initial ratings or other adjustments).
   */
  const renderActiveDot = (props: DotProps) => {
    const {
      cx: xPosition,
      cy: yPosition,
      payload: dataPoint,
    } = props as DotProps & {
      cx?: number;
      cy?: number;
      payload?: ChartDataPoint;
    };

    // Only render dots for match adjustments with valid match IDs
    if (
      !dataPoint ||
      dataPoint.adjustmentType !== RatingAdjustmentType.Match ||
      !dataPoint.match?.id
    ) {
      return null;
    }

    const dotColor =
      activeTab === 'rating' ? chartColors.rating : chartColors.volatility;

    return (
      <Link href={`/matches/${dataPoint.match.id}`} target="_blank">
        <circle
          cx={xPosition}
          cy={yPosition}
          r={CHART_CONSTANTS.ACTIVE_DOT_RADIUS}
          fill={dotColor}
          stroke={chartColors.background}
          strokeWidth={2}
          style={{ cursor: 'pointer' }}
        />
      </Link>
    );
  };

  /**
   * Formats Y-axis tick values as rounded integers.
   */
  const formatYAxisTick = (tickValue: number) =>
    Math.round(tickValue).toString();

  // Calculate readable Y-axis bounds
  const yAxisConfig = calculateReadableYAxisBounds(chartData, activeTab);

  return (
    <ChartContainer
      config={chartConfig}
      className="max-h-[375px] min-h-[300px] w-full"
    >
      <ResponsiveContainer>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartColors.grid}
            vertical={false}
          />
          <XAxis
            type="number"
            dataKey="timestampValue"
            domain={['dataMin', 'dataMax']}
            scale="time"
            stroke={chartColors.text}
            tick={{ fill: chartColors.text, fontSize: 12 }}
            tickLine={{ stroke: chartColors.grid }}
            fontFamily="sans-serif"
            ticks={xAxisTickMarks}
            tickFormatter={formatXAxisTick}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke={chartColors.text}
            tick={{ fill: chartColors.text, fontSize: 12 }}
            tickLine={{ stroke: chartColors.grid }}
            tickFormatter={formatYAxisTick}
            domain={yAxisConfig.domain}
            ticks={yAxisConfig.ticks}
            width={CHART_CONSTANTS.Y_AXIS_WIDTH}
          />
          <RechartsTooltip
            content={<PlayerRatingChartTooltip activeTab={activeTab} />}
            cursor={{
              stroke: chartColors.text,
              strokeWidth: 1,
              strokeDasharray: '3 3',
            }}
          />
          <Legend />
          {activeTab === 'rating' && highestRating && (
            <ReferenceLine
              y={highestRating}
              label={{
                value: 'Peak',
                position: 'insideTopLeft',
                fill: chartColors.text,
                fontSize: 12,
              }}
              stroke={chartColors.rating}
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />
          )}
          <Line
            type="monotone"
            dataKey={`${activeTab}After`}
            name={capitalize(activeTab)}
            stroke={
              activeTab === 'rating'
                ? chartColors.rating
                : chartColors.volatility
            }
            strokeWidth={CHART_CONSTANTS.LINE_WIDTH}
            dot={false}
            activeDot={(props: unknown) =>
              renderActiveDot(props as DotProps) || <></>
            }
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

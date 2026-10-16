'use client';

import { RatingAdjustmentType } from '@otr/core/osu';
import { ChartLine } from 'lucide-react';
import Link from 'next/link';
import {
  CartesianGrid,
  type DotProps,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltipContent } from '@/components/kit/charts/ChartTooltip';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { RatingDelta } from '@/components/kit/format/RatingDelta';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import {
  CHART_CURSOR,
  CHART_LINE_WIDTH,
  CHART_MARGIN,
  CHART_TICK_STYLE,
  chartAxisProps,
  chartGridProps,
  chartValueAxisProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';
import { formatNumberTick, formatTimeTick } from '@/lib/kit/charts/format';
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  getNiceTicks,
  getTimeTicks,
} from '@/lib/kit/charts/ticks';
import { seriesColor } from '@/lib/kit/color/categorical';
import { formatDate } from '@/lib/kit/format/date';
import { RATING_ADJUSTMENT_TYPE_LABELS } from '@/lib/kit/format/enum-labels';
import { formatNumber, formatRatingPrecise } from '@/lib/kit/format/number';
import type { PlayerRatingAdjustment } from '@/lib/orpc/schema/playerStats';

import type { RatingMetric } from './rating-adjustment';

const MIN_DATA_POINTS = 2;
const ACTIVE_DOT_RADIUS = 5;
const LINE_COLOR = seriesColor(0);

interface ChartDataPoint extends PlayerRatingAdjustment {
  timestampValue: number;
}

const METRIC_LABELS: Record<RatingMetric, string> = {
  rating: 'Rating',
  volatility: 'Volatility',
};

function formatMetricValue(metric: RatingMetric, value: number): string {
  return metric === 'rating'
    ? formatRatingPrecise(value)
    : formatNumber(value, { maxDecimals: 2 });
}

/** A point's dot links to its match, in a new tab, when it has one. */
function MatchDot(props: DotProps & { payload?: ChartDataPoint }) {
  const { cx, cy, payload } = props;

  if (
    cx === undefined ||
    cy === undefined ||
    payload?.adjustmentType !== RatingAdjustmentType.Match ||
    !payload.match?.id
  ) {
    return <g />;
  }

  return (
    <Link
      href={`/matches/${payload.match.id}`}
      target="_blank"
      aria-label={`Open ${payload.match.name}`}
    >
      <circle
        cx={cx}
        cy={cy}
        r={ACTIVE_DOT_RADIUS}
        fill={LINE_COLOR}
        stroke="var(--background)"
        strokeWidth={2}
        className="cursor-pointer"
      />
    </Link>
  );
}

/**
 * The rating history line. The x axis ticks fall on UTC calendar
 * boundaries and the y axis follows the site's tick rule; a dashed muted
 * rule marks the peak rating.
 */
export default function PlayerRatingChartView({
  data,
  metric,
  highestRating,
}: {
  data: PlayerRatingAdjustment[];
  metric: RatingMetric;
  highestRating: number | undefined;
}) {
  const maxTicks = useIsNarrowChart() ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS;

  if (!data || data.length < MIN_DATA_POINTS) {
    return (
      <EmptyState
        size="compact"
        icon={ChartLine}
        title="Not enough data to display a chart"
      />
    );
  }

  const dataKey = metric === 'rating' ? 'ratingAfter' : 'volatilityAfter';
  const chartData: ChartDataPoint[] = data
    .map((adjustment) => ({
      ...adjustment,
      timestampValue: new Date(adjustment.timestamp).getTime(),
    }))
    .sort((a, b) => a.timestampValue - b.timestampValue);

  const values = chartData.map((point) => point[dataKey]);
  // The peak rule shows only when it falls inside the plotted range.
  const showPeak = metric === 'rating' && highestRating !== undefined;
  const yTicks = getNiceTicks(Math.min(...values), Math.max(...values));
  const time = getTimeTicks(
    chartData[0].timestampValue,
    chartData[chartData.length - 1].timestampValue,
    maxTicks
  );

  return (
    <ChartContainer config={{}} className="aspect-auto h-72 w-full">
      <LineChart data={chartData} margin={CHART_MARGIN}>
        <CartesianGrid {...chartGridProps} />
        <XAxis
          {...chartAxisProps}
          dataKey="timestampValue"
          type="number"
          scale="time"
          domain={['dataMin', 'dataMax']}
          ticks={time.ticks}
          interval={0}
          tickFormatter={(value: number) => formatTimeTick(value, time.unit)}
        />
        <YAxis
          {...chartValueAxisProps}
          {...niceAxisProps(yTicks)}
          tickFormatter={formatNumberTick}
        />
        <ChartTooltip
          cursor={CHART_CURSOR.line}
          content={
            <ChartTooltipContent
              marker="line"
              labelFormatter={(label) => formatDate(Number(label))}
              nameFormatter={() => METRIC_LABELS[metric]}
              valueFormatter={(value) => formatMetricValue(metric, value)}
              footer={(payload) => {
                const point = payload[0]?.payload as ChartDataPoint | undefined;
                if (!point) return null;
                const delta =
                  metric === 'rating'
                    ? point.ratingDelta
                    : point.volatilityDelta;

                return (
                  <span className="grid gap-0.5">
                    <span className="flex items-center justify-between gap-3">
                      {RATING_ADJUSTMENT_TYPE_LABELS[point.adjustmentType]}
                      <RatingDelta
                        value={delta}
                        lowerIsBetter={metric === 'volatility'}
                      />
                    </span>
                    {point.match?.name ? (
                      <span className="max-w-56 truncate">
                        {point.match.name}
                      </span>
                    ) : null}
                  </span>
                );
              }}
            />
          }
        />
        {showPeak ? (
          <ReferenceLine
            y={highestRating}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: 'Peak',
              position: 'insideTopLeft',
              ...CHART_TICK_STYLE,
            }}
          />
        ) : null}
        <Line
          type="monotone"
          dataKey={dataKey}
          name={METRIC_LABELS[metric]}
          stroke={LINE_COLOR}
          strokeWidth={CHART_LINE_WIDTH}
          dot={false}
          activeDot={(props: unknown) => (
            <MatchDot {...(props as DotProps & { payload?: ChartDataPoint })} />
          )}
          isAnimationActive={false}
          connectNulls
        />
      </LineChart>
    </ChartContainer>
  );
}

'use client';

import type { Ruleset } from '@otr/core/osu';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts';

import TierIcon from '@/components/icons/TierIcon';
import { ChartLegend } from '@/components/kit/charts/ChartLegend';
import {
  ChartTooltipContent,
  type ChartTooltipPayloadItem,
} from '@/components/kit/charts/ChartTooltip';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import {
  CHART_CURSOR,
  CHART_MARGIN,
  chartAxisProps,
  chartGridProps,
  chartValueAxisProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';
import { formatCountTick, formatNumberTick } from '@/lib/kit/charts/format';
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  getCategoryTicks,
  getNiceTicks,
} from '@/lib/kit/charts/ticks';
import { getTierColor } from '@/lib/kit/color/tiers';
import { formatPercent } from '@/lib/kit/format/number';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import { formatTierName } from '@/lib/kit/format/tier';

import {
  type RatingBucket,
  type RatingDistribution,
  getRatingBucketStart,
} from './stats-data';

/** Thin bars: a 4px radius would round them into pills. */
const BUCKET_BAR_RADIUS: [number, number, number, number] = [2, 2, 0, 0];

/** The visitor's own rating: a dashed rule in the text colour. */
const YOU_COLOR = 'var(--foreground)';

function bucketOf(
  payload: readonly ChartTooltipPayloadItem[]
): RatingBucket | undefined {
  return payload[0]?.payload as RatingBucket | undefined;
}

/**
 * Players per rating bucket in one ruleset, each bar in its tier's colour,
 * with the signed-in player's rating marked "You".
 */
export default function RatingDistributionChart({
  ruleset,
  distribution,
  bucketSize,
  userRating,
}: {
  ruleset: Ruleset;
  distribution: RatingDistribution;
  /** The width of a bucket in rating points, as the server groups them. */
  bucketSize: number;
  userRating?: number;
}) {
  const isNarrow = useIsNarrowChart();
  const { buckets, tiers } = distribution;
  const starts = new Set(buckets.map((bucket) => bucket.rating));

  const yTicks = getNiceTicks(
    0,
    Math.max(0, ...buckets.map((bucket) => bucket.count)),
    { integer: true }
  );
  // Bucket starts are categories, so the ticks stay inside the data.
  const xTicks = getCategoryTicks(
    buckets.map((bucket) => bucket.rating),
    isNarrow ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS
  );

  const userBucket =
    userRating === undefined
      ? undefined
      : getRatingBucketStart(userRating, bucketSize);
  const showUser = userBucket !== undefined && starts.has(userBucket);

  return (
    <div
      data-testid={`chart-rating-distribution-${ruleset}`}
      className="flex flex-col gap-3"
    >
      <ChartLegend
        items={[
          ...tiers.map((tier) => ({
            key: tier,
            label: formatTierName(tier, undefined),
            color: getTierColor(tier),
          })),
          ...(showUser
            ? [
                {
                  key: 'you',
                  label: 'You',
                  color: YOU_COLOR,
                  marker: 'dashed' as const,
                },
              ]
            : []),
        ]}
      />
      <ChartContainer config={{}} className="aspect-auto h-72 w-full">
        <BarChart
          data={buckets}
          // Room above the plot for the "You" label.
          margin={{ ...CHART_MARGIN, top: showUser ? 20 : CHART_MARGIN.top }}
          // On phones a bucket is under 3px wide; a gap would leave no bar.
          barCategoryGap={isNarrow ? 0 : 1}
        >
          <CartesianGrid {...chartGridProps} />
          <XAxis
            {...chartAxisProps}
            dataKey="rating"
            ticks={xTicks}
            interval={0}
            tickFormatter={formatNumberTick}
          />
          <YAxis
            {...chartValueAxisProps}
            {...niceAxisProps(yTicks)}
            tickFormatter={formatCountTick}
          />
          <ChartTooltip
            cursor={CHART_CURSOR.bar}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const bucket = bucketOf(payload);
                  if (!bucket) return null;
                  return (
                    <span className="flex items-center gap-1.5">
                      <TierIcon
                        tier={bucket.tier}
                        subTier={bucket.subTier}
                        width={16}
                        height={16}
                        className="shrink-0"
                      />
                      {formatTierName(bucket.tier, bucket.subTier)}
                    </span>
                  );
                }}
                nameFormatter={() => 'Players'}
                valueFormatter={formatCountTick}
                footer={(payload) => {
                  const bucket = bucketOf(payload);
                  if (!bucket) return null;
                  return (
                    <>
                      <div>
                        Rating {formatNumberTick(bucket.rating)} –{' '}
                        {formatNumberTick(bucket.rating + bucketSize - 1)}
                      </div>
                      <div>Cumulative {formatPercent(bucket.cumulative)}</div>
                    </>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="count"
            name="Players"
            radius={BUCKET_BAR_RADIUS}
            isAnimationActive={false}
          >
            {buckets.map((bucket) => (
              <Cell key={bucket.rating} fill={bucket.fill} />
            ))}
          </Bar>
          {showUser ? (
            <ReferenceLine
              x={userBucket}
              stroke={YOU_COLOR}
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'You',
                position: 'top',
                fill: YOU_COLOR,
                fontSize: 12,
                fontWeight: 500,
              }}
            />
          ) : null}
        </BarChart>
      </ChartContainer>
    </div>
  );
}

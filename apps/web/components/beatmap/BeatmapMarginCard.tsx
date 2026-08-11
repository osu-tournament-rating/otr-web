'use client';

import { Swords } from 'lucide-react';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import type {
  BeatmapMarginBucket,
  BeatmapTeamVsMarginSummary,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import {
  CHART_CONSTANTS,
  formatChartNumber,
  formatPercentage,
} from '@/lib/utils/chart';

interface BeatmapMarginCardProps {
  margins: BeatmapTeamVsMarginSummary;
  className?: string;
}

const chartConfig: ChartConfig = {
  gameCount: {
    label: 'Games',
    color: 'var(--chart-1)',
  },
};

/** `0–1%`, `2.5–5%`, … and `40%+` for the open-ended last bucket. */
function marginBucketLabel({ lowerBound, upperBound }: BeatmapMarginBucket) {
  return upperBound != null
    ? `${lowerBound}–${upperBound}%`
    : `${lowerBound}%+`;
}

export default function BeatmapMarginCard({
  margins,
  className,
}: BeatmapMarginCardProps) {
  const chartData = React.useMemo(
    () =>
      margins.buckets.map((bucket) => ({
        label: marginBucketLabel(bucket),
        gameCount: bucket.gameCount,
      })),
    [margins.buckets]
  );

  return (
    <SectionCard data-testid="beatmap-margin" className={cn(className)}>
      <SectionHeader
        icon={Swords}
        title="Game closeness"
        meta={
          margins.medianMarginPercentage != null
            ? `median ${formatPercentage(margins.medianMarginPercentage, 1)}`
            : undefined
        }
      />
      {margins.gameCount === 0 ? (
        <EmptyState>No team-vs games recorded for this beatmap.</EmptyState>
      ) : (
        <div className="space-y-3 px-4 py-4">
          <p className="text-xs text-muted-foreground">
            How one-sided were games on this map?
          </p>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[220px] w-full"
          >
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval={0}
              />
              <YAxis
                width={32}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatChartNumber}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideIndicator
                    formatter={(value) => (
                      <span className="font-medium text-foreground tabular-nums">
                        {formatChartNumber(Number(value))} games
                      </span>
                    )}
                  />
                }
              />
              <Bar
                dataKey="gameCount"
                fill="var(--chart-1)"
                radius={CHART_CONSTANTS.BORDER_RADIUS}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
          <p className="text-xs text-muted-foreground">
            Left-heavy = coinflip map, right-heavy = stomps.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

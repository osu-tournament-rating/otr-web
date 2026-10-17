'use client';

import { Target } from 'lucide-react';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { NotEnoughData } from '@/components/beatmap/BeatmapSection';
import { ChartTooltipContent } from '@/components/kit/charts/ChartTooltip';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import { seriesColor } from '@/lib/kit/color/categorical';
import {
  CHART_BAR_RADIUS,
  CHART_CURSOR,
  CHART_MARGIN,
  chartAxisProps,
  chartGridProps,
  chartValueAxisProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';
import { formatCountTick } from '@/lib/kit/charts/format';
import { getNiceTicks } from '@/lib/kit/charts/ticks';
import { formatCount, formatCountOf } from '@/lib/kit/format/number';
import type {
  BeatmapMissBucket,
  BeatmapPerformanceSummary,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';

interface BeatmapPerformanceCardProps {
  performance: BeatmapPerformanceSummary;
  className?: string;
}

const MISS_BUCKET_LABELS = ['0', '1', '2', '3', '4', '5+'] as const;

const missChartConfig = {
  scoreCount: {
    label: 'Scores',
    color: seriesColor(0),
  },
} satisfies ChartConfig;

function buildMissChartData(missDistribution: BeatmapMissBucket[]) {
  const counts = new Array<number>(MISS_BUCKET_LABELS.length).fill(0);

  for (const bucket of missDistribution) {
    if (bucket.misses >= 0 && bucket.misses < counts.length) {
      counts[bucket.misses] += bucket.scoreCount;
    }
  }

  return MISS_BUCKET_LABELS.map((label, index) => ({
    label,
    scoreCount: counts[index],
  }));
}

export default function BeatmapPerformanceCard({
  performance,
  className,
}: BeatmapPerformanceCardProps) {
  const { scoreCount, missDataScoreCount, missDistribution } = performance;

  const missChartData = React.useMemo(
    () => buildMissChartData(missDistribution),
    [missDistribution]
  );

  const excludedMissCount = scoreCount - missDataScoreCount;
  const countTicks = React.useMemo(
    () =>
      getNiceTicks(
        0,
        Math.max(...missChartData.map((bucket) => bucket.scoreCount)),
        { integer: true }
      ),
    [missChartData]
  );

  return (
    <Panel
      data-testid="beatmap-performance"
      className={cn('flex flex-col', className)}
    >
      <SectionHeader
        icon={Target}
        title="Misses"
        meta={
          excludedMissCount > 0
            ? `${formatCount(missDataScoreCount)} of ${formatCountOf(scoreCount, 'score')}`
            : formatCountOf(scoreCount, 'score')
        }
      />

      {scoreCount === 0 || missDataScoreCount === 0 ? (
        <NotEnoughData />
      ) : (
        <div className="flex flex-1 flex-col gap-3 px-4 py-4">
          <ChartContainer
            config={missChartConfig}
            className="aspect-auto min-h-[140px] w-full flex-1"
          >
            <BarChart data={missChartData} margin={CHART_MARGIN}>
              <CartesianGrid {...chartGridProps} />
              <XAxis {...chartAxisProps} dataKey="label" interval={0} />
              <YAxis
                {...chartValueAxisProps}
                {...niceAxisProps(countTicks)}
                tickFormatter={formatCountTick}
              />
              <ChartTooltip
                cursor={CHART_CURSOR.bar}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      `${label} ${label === '1' ? 'miss' : 'misses'}`
                    }
                    nameFormatter={() => 'Scores'}
                    valueFormatter={formatCountTick}
                  />
                }
              />
              <Bar
                dataKey="scoreCount"
                name="Scores"
                fill={seriesColor(0)}
                radius={CHART_BAR_RADIUS}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </div>
      )}
    </Panel>
  );
}

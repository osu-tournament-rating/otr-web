'use client';

import { Target } from 'lucide-react';
import * as React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type {
  BeatmapMissBucket,
  BeatmapPerformanceSummary,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { CHART_CONSTANTS, formatChartNumber } from '@/lib/utils/chart';

interface BeatmapPerformanceCardProps {
  performance: BeatmapPerformanceSummary;
  className?: string;
}

const MISS_BUCKET_LABELS = ['0', '1', '2', '3', '4', '5+'] as const;

const missChartConfig = {
  scoreCount: {
    label: 'Scores',
    color: 'var(--chart-1)',
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

  return (
    <SectionCard
      data-testid="beatmap-performance"
      className={cn('flex flex-col', className)}
    >
      <SectionHeader
        icon={Target}
        title="Misses"
        meta={
          excludedMissCount > 0
            ? `${formatChartNumber(missDataScoreCount)} of ${formatChartNumber(scoreCount)} scores`
            : `${formatChartNumber(scoreCount)} scores`
        }
      />

      {scoreCount === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-1 flex-col gap-3 px-4 py-4">
          {missDataScoreCount === 0 ? (
            <p className="text-sm text-muted-foreground">Not enough data</p>
          ) : (
            <ChartContainer
              config={missChartConfig}
              className="aspect-auto min-h-[140px] w-full flex-1"
            >
              <BarChart
                data={missChartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                />
                <YAxis
                  // 40 to match the sibling count axes; "1,800" clips at 32.
                  width={40}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatChartNumber}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label) =>
                        `${label} ${label === '1' ? 'miss' : 'misses'}`
                      }
                      formatter={(value) => (
                        <span className="font-medium text-foreground">
                          {formatChartNumber(Number(value))} scores
                        </span>
                      )}
                    />
                  }
                />
                <Bar
                  dataKey="scoreCount"
                  fill="var(--chart-1)"
                  radius={CHART_CONSTANTS.BORDER_RADIUS}
                  isAnimationActive={false}
                />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      )}
    </SectionCard>
  );
}

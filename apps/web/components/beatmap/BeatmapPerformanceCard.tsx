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
    <SectionCard data-testid="beatmap-performance" className={cn(className)}>
      <SectionHeader
        icon={Target}
        title="Misses"
        meta={`${formatChartNumber(scoreCount)} scores`}
      />

      {scoreCount === 0 ? (
        <EmptyState>No verified scores yet.</EmptyState>
      ) : (
        <div>
          <div className="space-y-2 px-4 py-3">
            {missDataScoreCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                No miss data recorded for these scores.
              </p>
            ) : (
              <>
                <ChartContainer
                  config={missChartConfig}
                  className="h-[140px] w-full"
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
                      width={32}
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
                            <span className="font-medium text-foreground tabular-nums">
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
                {excludedMissCount > 0 ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatChartNumber(excludedMissCount)} scores without miss
                    data excluded
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

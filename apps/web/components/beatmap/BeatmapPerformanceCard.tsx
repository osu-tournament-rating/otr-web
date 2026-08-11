'use client';

import { Target } from 'lucide-react';
import * as React from 'react';
import { Bar, BarChart, XAxis } from 'recharts';

import {
  EmptyState,
  Eyebrow,
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
  BeatmapGradeCount,
  BeatmapMissBucket,
  BeatmapPerformanceSummary,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import {
  CHART_CONSTANTS,
  formatChartNumber,
  formatPercentage,
} from '@/lib/utils/chart';
import { ScoreGrade } from '@otr/core/osu';

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

/**
 * Silver and normal grades are combined for display: SSH+SS read as SS and
 * SH+S read as S. Ordered best to worst.
 */
const GRADE_GROUPS = [
  {
    label: 'SS',
    grades: [ScoreGrade.SSH, ScoreGrade.SS],
    fill: 'var(--chart-1)',
  },
  { label: 'S', grades: [ScoreGrade.SH, ScoreGrade.S], fill: 'var(--chart-2)' },
  { label: 'A', grades: [ScoreGrade.A], fill: 'var(--chart-3)' },
  { label: 'B', grades: [ScoreGrade.B], fill: 'var(--chart-4)' },
  { label: 'C', grades: [ScoreGrade.C], fill: 'var(--chart-5)' },
  { label: 'D', grades: [ScoreGrade.D], fill: 'var(--muted-foreground)' },
] as const;

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

function buildGradeSegments(gradeDistribution: BeatmapGradeCount[]) {
  const countsByGrade = new Map<ScoreGrade, number>();

  for (const { grade, scoreCount } of gradeDistribution) {
    countsByGrade.set(grade, (countsByGrade.get(grade) ?? 0) + scoreCount);
  }

  const grouped = GRADE_GROUPS.map((group) => ({
    label: group.label,
    fill: group.fill,
    scoreCount: group.grades.reduce(
      (total, grade) => total + (countsByGrade.get(grade) ?? 0),
      0
    ),
  })).filter((group) => group.scoreCount > 0);

  const totalGraded = grouped.reduce(
    (total, group) => total + group.scoreCount,
    0
  );

  return grouped.map((group) => ({
    ...group,
    percentage: totalGraded > 0 ? (group.scoreCount / totalGraded) * 100 : 0,
  }));
}

export default function BeatmapPerformanceCard({
  performance,
  className,
}: BeatmapPerformanceCardProps) {
  const {
    scoreCount,
    missDataScoreCount,
    missDistribution,
    gradeDistribution,
  } = performance;

  const missChartData = React.useMemo(
    () => buildMissChartData(missDistribution),
    [missDistribution]
  );

  const gradeSegments = React.useMemo(
    () => buildGradeSegments(gradeDistribution),
    [gradeDistribution]
  );

  const excludedMissCount = scoreCount - missDataScoreCount;

  return (
    <SectionCard data-testid="beatmap-performance" className={cn(className)}>
      <SectionHeader
        icon={Target}
        title="Performance"
        meta={`${formatChartNumber(scoreCount)} scores`}
      />

      {scoreCount === 0 ? (
        <EmptyState>No verified scores yet.</EmptyState>
      ) : (
        <div className="divide-y">
          <div className="space-y-2 px-4 py-3">
            <Eyebrow>Misses</Eyebrow>
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
                    margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(label) =>
                            `${label} ${label === '1' ? 'miss' : 'misses'}`
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="scoreCount"
                      fill="var(--chart-1)"
                      radius={CHART_CONSTANTS.BORDER_RADIUS}
                    />
                  </BarChart>
                </ChartContainer>
                {excludedMissCount > 0 ? (
                  <p className="font-mono text-xs text-muted-foreground tabular-nums">
                    {formatChartNumber(excludedMissCount)} scores without miss
                    data excluded
                  </p>
                ) : null}
              </>
            )}
          </div>

          <div className="space-y-3 px-4 py-3">
            <Eyebrow>Grades</Eyebrow>
            {gradeSegments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No grade data recorded for these scores.
              </p>
            ) : (
              <>
                {/* The legend below carries the same values as text, so the
                    bar is presentational only. */}
                <div
                  data-testid="beatmap-grade-distribution-bar"
                  className="flex h-7 w-full gap-[2px]"
                  aria-hidden="true"
                >
                  {gradeSegments.map((segment) => (
                    <div
                      key={segment.label}
                      // Flex growth keeps the 2px gaps from pushing the row
                      // past 100%.
                      className="h-full min-w-[3px] first:rounded-l-md last:rounded-r-md"
                      style={{
                        flex: `${segment.percentage} 1 0`,
                        backgroundColor: segment.fill,
                      }}
                    />
                  ))}
                </div>

                <ul
                  aria-label="Grade distribution"
                  className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs"
                >
                  {gradeSegments.map((segment) => (
                    <li
                      key={segment.label}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className="size-2 rounded-[2px]"
                        style={{ backgroundColor: segment.fill }}
                        aria-hidden="true"
                      />
                      <span className="font-medium">{segment.label}</span>
                      <span className="font-mono text-muted-foreground tabular-nums">
                        {formatPercentage(segment.percentage, 1)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

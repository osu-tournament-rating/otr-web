'use client';

import { ChartCandlestick } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  EmptyState,
  Eyebrow,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import SimpleTooltip from '@/components/simple-tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type {
  BeatmapModScoreDistribution,
  BeatmapScorePercentilePoint,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import {
  CHART_COLORS,
  formatChartNumber,
  formatKilo,
  formatPercentage,
} from '@/lib/utils/chart';
import { getBeatmapModLabel, getModColor } from '@/lib/utils/mods';

interface BeatmapScoreDistributionCardProps {
  distribution: BeatmapModScoreDistribution[];
  percentiles: BeatmapScorePercentilePoint[];
  className?: string;
}

const PERCENTILE_CHART_CONFIG = {
  percentile: { label: 'Percentile' },
};

/** Positions a value on the shared 0..max score scale as a CSS percentage. */
function toScalePercent(value: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.min(100, Math.max(0, (value / maxScore) * 100));
}

function BoxPlotRow({
  group,
  maxScore,
}: {
  group: BeatmapModScoreDistribution;
  maxScore: number;
}) {
  const label = getBeatmapModLabel(group.mods);
  const color = getModColor(group.mods);

  const minPct = toScalePercent(group.minScore, maxScore);
  const maxPct = toScalePercent(group.maxScore, maxScore);
  const p25Pct = toScalePercent(group.p25Score, maxScore);
  const p75Pct = toScalePercent(group.p75Score, maxScore);
  const medianPct = toScalePercent(group.medianScore, maxScore);

  return (
    <SimpleTooltip
      content={
        <div className="min-w-44 space-y-1">
          <div className="flex items-center justify-between gap-4 border-b pb-1.5">
            <span className="flex items-center gap-1.5">
              <span
                className="size-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="text-xs font-medium">{label}</span>
            </span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {`${formatChartNumber(group.scoreCount)} scores`}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs text-muted-foreground">Median</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {formatChartNumber(group.medianScore)}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs text-muted-foreground">Middle 50%</span>
            <span className="font-mono text-xs tabular-nums">
              {`${formatChartNumber(group.p25Score)} – ${formatChartNumber(group.p75Score)}`}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs text-muted-foreground">Range</span>
            <span className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
              <span
                className="size-1.5 shrink-0 rounded-full border bg-transparent"
                style={{ borderColor: color }}
                aria-hidden="true"
              />
              {`${formatChartNumber(group.minScore)} – ${formatChartNumber(group.maxScore)}`}
              <span
                className="size-1.5 shrink-0 rounded-full border bg-transparent"
                style={{ borderColor: color }}
                aria-hidden="true"
              />
            </span>
          </div>
        </div>
      }
    >
      <div className="flex min-h-7 items-center gap-2">
        <span className="flex w-16 shrink-0 items-center gap-1.5">
          <span
            className="size-2 shrink-0 rounded-[2px]"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
          <span className="truncate text-xs font-medium">{label}</span>
        </span>

        <span className="sr-only">
          {`${label}: ${formatChartNumber(group.scoreCount)} scores, minimum ${formatChartNumber(group.minScore)}, 25th percentile ${formatChartNumber(group.p25Score)}, median ${formatChartNumber(group.medianScore)}, 75th percentile ${formatChartNumber(group.p75Score)}, maximum ${formatChartNumber(group.maxScore)}`}
        </span>

        <div
          className="relative h-7 min-w-0 flex-1 rounded bg-muted/40"
          aria-hidden="true"
        >
          {/* Whisker: min → max, inset so it stops short of the hollow rings */}
          <div
            className="absolute top-1/2 h-px -translate-y-1/2 bg-muted-foreground/50"
            style={{
              left: `calc(${minPct}% + 5px)`,
              width: `max(0px, calc(${Math.max(maxPct - minPct, 0)}% - 10px))`,
            }}
          />
          {/* IQR box: p25 → p75 */}
          <div
            className="absolute inset-y-1 rounded"
            style={{
              left: `${p25Pct}%`,
              width: `${Math.max(p75Pct - p25Pct, 0)}%`,
              minWidth: 2,
              backgroundColor: color,
              opacity: 0.7,
            }}
          />
          {/* Median tick */}
          <div
            className="absolute inset-y-0.5 w-[2px] -translate-x-1/2 rounded-full bg-foreground"
            style={{ left: `${medianPct}%` }}
          />
          {/* Hollow min / max rings */}
          <div
            className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-transparent"
            style={{ left: `${minPct}%`, borderColor: color }}
          />
          <div
            className="absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-transparent"
            style={{ left: `${maxPct}%`, borderColor: color }}
          />
        </div>

        <span
          className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums"
          aria-hidden="true"
        >
          {formatKilo(group.medianScore)}
        </span>
      </div>
    </SimpleTooltip>
  );
}

function PercentileCurve({
  percentiles,
}: {
  percentiles: BeatmapScorePercentilePoint[];
}) {
  return (
    <ChartContainer
      config={PERCENTILE_CHART_CONFIG}
      className="h-[240px] w-full"
    >
      <AreaChart
        data={percentiles}
        margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="score"
          type="number"
          domain={['dataMin', 'dataMax']}
          tickFormatter={(value: number) => formatKilo(value)}
          tickLine={false}
          axisLine={false}
          stroke={CHART_COLORS.mutedForeground}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(value: number) => `${value}%`}
          tickLine={false}
          axisLine={false}
          stroke={CHART_COLORS.mutedForeground}
          width={40}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              hideLabel
              hideIndicator
              formatter={(value, _name, item) => {
                const point = item?.payload as
                  | BeatmapScorePercentilePoint
                  | undefined;
                if (point == null || typeof value !== 'number') return null;

                return (
                  <span className="text-xs">
                    A score of{' '}
                    <span className="font-mono font-medium tabular-nums">
                      {formatChartNumber(point.score)}
                    </span>{' '}
                    beats{' '}
                    <span className="font-mono font-medium tabular-nums">
                      {formatPercentage(value, 0)}
                    </span>{' '}
                    of tournament plays
                  </span>
                );
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="percentile"
          stroke="var(--chart-1)"
          fill="var(--chart-1)"
          fillOpacity={0.15}
          strokeWidth={2}
          dot={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export default function BeatmapScoreDistributionCard({
  distribution,
  percentiles,
  className,
}: BeatmapScoreDistributionCardProps) {
  const totalScoreCount = distribution.reduce(
    (total, group) => total + group.scoreCount,
    0
  );
  const hasBoxData = distribution.length > 0;
  const hasCurveData = percentiles.length > 0;
  const hasData = hasBoxData || hasCurveData;

  const maxScore = distribution.reduce(
    (max, group) => Math.max(max, group.maxScore),
    0
  );

  return (
    <SectionCard
      data-testid="beatmap-score-distribution"
      className={cn(className)}
    >
      <SectionHeader
        icon={ChartCandlestick}
        title="Score distribution"
        meta={
          hasBoxData
            ? `${formatChartNumber(totalScoreCount)} scores`
            : undefined
        }
      />

      {!hasData ? (
        <EmptyState>No verified scores yet.</EmptyState>
      ) : (
        <div className="xl:grid xl:grid-cols-2 xl:divide-x">
          <div className="px-4 py-4">
            <Eyebrow>By mod</Eyebrow>
            {hasBoxData ? (
              <div
                className={cn(
                  'mt-3 flex flex-col max-xl:h-auto max-xl:justify-start max-xl:gap-2',
                  // Matching the percentile chart's height only pays off once
                  // there are enough rows to fill it; one or two rows stranded
                  // in 240px of nothing just reads as a broken panel.
                  distribution.length >= 3
                    ? 'h-[240px] justify-evenly'
                    : 'gap-2'
                )}
              >
                {distribution.map((group) => (
                  <BoxPlotRow
                    key={group.mods}
                    group={group}
                    maxScore={maxScore}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>No verified scores yet.</EmptyState>
            )}
            {hasBoxData ? (
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                Mod combinations with fewer than 5 scores hidden
              </p>
            ) : null}
          </div>

          <div className="border-t px-4 py-4 xl:border-t-0">
            <Eyebrow>Percentiles</Eyebrow>
            {hasCurveData ? (
              <div className="mt-3">
                <PercentileCurve percentiles={percentiles} />
              </div>
            ) : (
              <EmptyState>No verified scores yet.</EmptyState>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

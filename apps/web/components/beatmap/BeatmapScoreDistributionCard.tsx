'use client';

import { ChartCandlestick } from 'lucide-react';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  BoxPlotTrack,
  EmptyState,
  Eyebrow,
  ScaleAxis,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import TapTooltip from '@/components/tap-tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  formatScoreTick,
  getBoxPlotAxis,
  toAxisPercent,
  toBoxPlotMarks,
  type BoxPlotQuartiles,
  type NiceAxis,
} from '@/lib/beatmaps/chart-axis';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import type {
  BeatmapModScoreDistribution,
  BeatmapScorePercentilePoint,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import {
  CHART_COLORS,
  formatChartNumber,
  formatPercentage,
} from '@/lib/utils/chart';
import { getBeatmapModLabel, getModColor } from '@/lib/utils/mods';

interface BeatmapScoreDistributionCardProps {
  distribution: BeatmapModScoreDistribution[];
  percentiles: BeatmapScorePercentilePoint[];
  /**
   * Every verified score on the map, not just the ones that survive the
   * per-mod-combination clamp the rows below are drawn from.
   */
  totalScoreCount: number;
  className?: string;
}

const PERCENTILE_CHART_CONFIG = {
  percentile: { label: 'Percentile' },
};

function toScoreQuartiles(
  group: BeatmapModScoreDistribution
): BoxPlotQuartiles {
  return {
    min: group.minScore,
    p25: group.p25Score,
    median: group.medianScore,
    p75: group.p75Score,
    max: group.maxScore,
  };
}

function BoxPlotRow({
  group,
  axis,
  gridPercents,
}: {
  group: BeatmapModScoreDistribution;
  axis: NiceAxis;
  /** Interior axis tick positions, drawn through the track. */
  gridPercents: number[];
}) {
  const label = getBeatmapModLabel(group.mods);
  const color = getModColor(group.mods);

  const marks = toBoxPlotMarks(toScoreQuartiles(group), axis);

  return (
    <TapTooltip
      triggerAriaLabel={`${label}: ${formatChartNumber(group.scoreCount)} scores`}
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
            <span className="text-xs text-muted-foreground">
              {`${formatChartNumber(group.scoreCount)} scores`}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs text-muted-foreground">Median</span>
            <span className="text-sm font-semibold">
              {formatChartNumber(group.medianScore)}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs text-muted-foreground">Middle 50%</span>
            <span className="text-xs">
              {`${formatChartNumber(group.p25Score)} – ${formatChartNumber(group.p75Score)}`}
            </span>
          </div>

          <div className="flex items-baseline justify-between gap-4">
            <span className="text-xs text-muted-foreground">Range</span>
            <span className="flex items-center gap-1.5 text-xs">
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
          <span className="truncate text-xs">{label}</span>
        </span>

        <BoxPlotTrack color={color} marks={marks} gridPercents={gridPercents} />
      </div>
    </TapTooltip>
  );
}

function PercentileCurve({
  percentiles,
}: {
  percentiles: BeatmapScorePercentilePoint[];
}) {
  // Five score ticks collide into an unreadable smear on a phone.
  const isNarrow = useMediaQuery('(max-width: 639px)');

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
          tickFormatter={(value: number) => formatScoreTick(value)}
          tickLine={false}
          axisLine={false}
          stroke={CHART_COLORS.mutedForeground}
          tickCount={isNarrow ? 3 : 5}
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
                    <span className="font-medium">
                      {formatChartNumber(point.score)}
                    </span>{' '}
                    beats{' '}
                    <span className="font-medium">
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
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export default function BeatmapScoreDistributionCard({
  distribution,
  percentiles,
  totalScoreCount,
  className,
}: BeatmapScoreDistributionCardProps) {
  const hasBoxData = distribution.length > 0;
  const hasCurveData = percentiles.length > 0;
  const hasData = hasBoxData || hasCurveData;

  // Six labels smear together on a phone-width track.
  const isNarrow = useMediaQuery('(max-width: 639px)');

  const axis = React.useMemo(
    () => getBoxPlotAxis(distribution.map(toScoreQuartiles), isNarrow ? 4 : 6),
    [distribution, isNarrow]
  );

  const axisTicks = axis.ticks.map((value) => ({
    value,
    label: formatScoreTick(value),
    percent: toAxisPercent(value, axis.min, axis.max),
  }));

  // Endpoint ticks would just trace the edges of the track.
  const gridPercents = axisTicks.slice(1, -1).map((tick) => tick.percent);

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
            <div className="flex items-baseline justify-between gap-2">
              <Eyebrow>Mod</Eyebrow>
              <span className="text-xs text-muted-foreground">
                fewer than 5 scores hidden
              </span>
            </div>
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
                    axis={axis}
                    gridPercents={gridPercents}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>No verified scores yet.</EmptyState>
            )}
            {hasBoxData ? (
              <ScaleAxis leftSpacerClassName="w-16" ticks={axisTicks} />
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

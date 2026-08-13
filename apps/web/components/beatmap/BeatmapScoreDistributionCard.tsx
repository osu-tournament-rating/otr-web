'use client';

import { ChartCandlestick } from 'lucide-react';
import * as React from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  BoxPlotTooltipContent,
  BoxPlotTrack,
  EmptyState,
  Eyebrow,
  FullRangeToggle,
  ScaleAxis,
  SectionCard,
  SectionHeader,
  Swatch,
} from '@/components/beatmap/BeatmapSection';
import TapTooltip from '@/components/tap-tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  formatScoreTick,
  getBoxPlotView,
  toBoxPlotMarks,
  type BoxPlotQuartiles,
  type NiceAxis,
} from '@/lib/beatmaps/chart-axis';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import type {
  BeatmapModScoreDistribution,
  BeatmapScorePercentilePoint,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';
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
    p20: group.p20Score,
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
  const quartiles = toScoreQuartiles(group);

  return (
    <TapTooltip
      triggerAriaLabel={`${label}: ${formatChartNumber(group.scoreCount)} scores`}
      content={
        <BoxPlotTooltipContent
          labelIcon={<Swatch color={color} />}
          label={label}
          scoreCount={group.scoreCount}
          measureLabel="Median"
          quartiles={quartiles}
          color={color}
          format={formatChartNumber}
        />
      }
    >
      <div className="flex min-h-7 items-center gap-2">
        <span className="flex w-16 shrink-0 items-center gap-1.5">
          <Swatch color={color} />
          <span className="truncate text-xs">{label}</span>
        </span>

        <BoxPlotTrack
          color={color}
          marks={toBoxPlotMarks(quartiles, axis)}
          gridPercents={gridPercents}
        />
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
  const isNarrow = useIsNarrowChart();

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
          tickCount={isNarrow ? 3 : 5}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(value: number) => `${value}%`}
          tickLine={false}
          axisLine={false}
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
  const isNarrow = useIsNarrowChart();

  const quartiles = React.useMemo(
    () => distribution.map(toScoreQuartiles),
    [distribution]
  );

  // A narrowing viewport can leave this pressed on a chart that no longer
  // clamps; getBoxPlotView ignores it, so no resize effect is needed.
  const [expanded, setExpanded] = React.useState(false);

  const view = React.useMemo(
    () =>
      getBoxPlotView(quartiles, formatScoreTick, isNarrow ? 4 : 6, expanded),
    [quartiles, isNarrow, expanded]
  );

  return (
    <SectionCard
      data-testid="beatmap-score-distribution"
      className={cn(className)}
    >
      <SectionHeader
        icon={ChartCandlestick}
        title="Score distribution"
        infoText="Mod rows with fewer than 5 scores are hidden."
        meta={
          hasBoxData
            ? `${formatChartNumber(totalScoreCount)} scores`
            : undefined
        }
      />

      {!hasData ? (
        <EmptyState />
      ) : (
        <div className="xl:grid xl:grid-cols-2 xl:divide-x">
          <div className="flex h-full flex-col px-4 py-4">
            <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <Eyebrow>Mod</Eyebrow>
              {view.canExpand ? (
                <FullRangeToggle
                  pressed={expanded}
                  onPressedChange={setExpanded}
                  label="Full range: score by mod"
                />
              ) : null}
            </div>
            {/* Too few rows to fill the percentile chart's height, so they ride
                the middle of the panel instead of stranding it below them. */}
            <div className={cn(distribution.length < 3 && 'xl:my-auto')}>
              {hasBoxData ? (
                <div
                  className={cn(
                    'mt-3 flex flex-col max-xl:h-auto max-xl:justify-start max-xl:gap-2',
                    distribution.length >= 3
                      ? 'h-[240px] justify-evenly'
                      : 'gap-2'
                  )}
                >
                  {distribution.map((group) => (
                    <BoxPlotRow
                      key={group.mods}
                      group={group}
                      axis={view.axis}
                      gridPercents={view.gridPercents}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState />
              )}
              {hasBoxData ? (
                <ScaleAxis leftSpacerClassName="w-16" ticks={view.ticks} />
              ) : null}
            </div>
          </div>

          <div className="border-t px-4 py-4 xl:border-t-0">
            {/* min-h-6 mirrors the toggle row across the divider, so both
                panels start their charts on the same line. */}
            <div className="flex min-h-6 items-center">
              <Eyebrow>Percentiles</Eyebrow>
            </div>
            {hasCurveData ? (
              <div className="mt-3">
                <PercentileCurve percentiles={percentiles} />
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

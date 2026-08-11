'use client';

import { ChartCandlestick } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  EmptyState,
  Eyebrow,
  ScaleFooter,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import TapTooltip from '@/components/tap-tooltip';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { getScoreFloor, toScorePercent } from '@/lib/beatmaps/score-scale';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
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

function BoxPlotRow({
  group,
  floorScore,
  maxScore,
}: {
  group: BeatmapModScoreDistribution;
  floorScore: number;
  maxScore: number;
}) {
  const label = getBeatmapModLabel(group.mods);
  const color = getModColor(group.mods);

  const minPct = toScorePercent(group.minScore, floorScore, maxScore);
  const maxPct = toScorePercent(group.maxScore, floorScore, maxScore);
  const p25Pct = toScorePercent(group.p25Score, floorScore, maxScore);
  const p75Pct = toScorePercent(group.p75Score, floorScore, maxScore);
  const medianPct = toScorePercent(group.medianScore, floorScore, maxScore);

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
          className="w-12 shrink-0 text-right text-xs font-medium text-foreground"
          aria-hidden="true"
        >
          {formatKilo(group.medianScore)}
        </span>
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
          tickFormatter={(value: number) => formatKilo(value)}
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

  const maxScore = distribution.reduce(
    (max, group) => Math.max(max, group.maxScore),
    0
  );
  const floorScore = getScoreFloor(distribution.map((group) => group.minScore));

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
            <div className="flex items-baseline justify-between">
              <Eyebrow>Mod</Eyebrow>
              {hasBoxData ? <Eyebrow>Median</Eyebrow> : null}
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
                    floorScore={floorScore}
                    maxScore={maxScore}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>No verified scores yet.</EmptyState>
            )}
            {hasBoxData ? (
              <>
                <ScaleFooter
                  leftSpacerClassName="w-16"
                  rightSpacerClassName="w-12"
                  minLabel={formatKilo(floorScore)}
                  maxLabel={formatKilo(maxScore)}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Mod combinations with fewer than 5 scores hidden
                </p>
              </>
            ) : null}
          </div>

          <div className="border-t px-4 py-4 xl:border-t-0">
            <Eyebrow>Percentiles</Eyebrow>
            {hasCurveData ? (
              <>
                <div className="mt-3">
                  <PercentileCurve percentiles={percentiles} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Each point shows the share of tournament plays a score beats.
                  Steep = scores bunched together, flat = wide gaps.
                </p>
              </>
            ) : (
              <EmptyState>No verified scores yet.</EmptyState>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

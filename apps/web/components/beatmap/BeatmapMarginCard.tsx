'use client';

import { Swords } from 'lucide-react';
import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts';

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
import { RulesetEnumHelper } from '@/lib/enum-helpers';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import type { BeatmapClosenessSummary } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { CHART_CONSTANTS, formatChartNumber } from '@/lib/utils/chart';

interface BeatmapMarginCardProps {
  closeness: BeatmapClosenessSummary;
  className?: string;
}

type ClosenessCohort = NonNullable<BeatmapClosenessSummary['cohort']>;

interface QuintileBin {
  label: string;
  count: number;
  /** Percent of the map's games, so the flat profile sits at 20. */
  share: number;
}

interface ClosenessDot {
  z: number;
  y: 0;
  /** The game's own winning-score gap, straight from its log ratio. */
  margin: number;
}

/** Share a map plays at when it matches its cohort exactly. */
const TYPICAL_SHARE = 20;

const chartConfig: ChartConfig = {
  share: {
    label: 'Share',
    color: 'var(--chart-1)',
  },
};

/**
 * Reads a standardized value back as the winning-score gap it came from, using
 * the dominant cohort's baseline. Score gaps are what the reader thinks in, and
 * they are 21x wider in osu! than in mania 4K, so the axis cannot speak in z.
 */
function marginPercent(z: number, cohort: ClosenessCohort) {
  return (1 - Math.exp(-(z * cohort.sdLogRatio + cohort.meanLogRatio))) * 100;
}

/** Two significant figures: `25` in osu!, `0.91` in mania 4K. */
function formatMarginValue(value: number) {
  const percent = Math.max(0, value);
  return percent.toFixed(percent >= 10 ? 0 : percent >= 1 ? 1 : 2);
}

function formatMargin(value: number) {
  return `${formatMarginValue(value)}%`;
}

function ordinal(value: number) {
  const teens = value % 100;
  if (teens >= 11 && teens <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function gamesLabel(count: number) {
  return `${formatChartNumber(count)} ${count === 1 ? 'game' : 'games'}`;
}

/**
 * Names the population the baseline was fitted over rather than the cohort the
 * map played. A cell with too few corpus games falls back to its ruleset or to
 * the whole corpus, and the caption would otherwise claim a band nobody
 * measured.
 */
function cohortLabel(cohort: ClosenessCohort) {
  if (cohort.baselineScope === 'global') return 'tournament';

  const ruleset = RulesetEnumHelper.getMetadata(cohort.ruleset).text;
  if (cohort.baselineScope === 'ruleset') return ruleset;

  const teams =
    cohort.teamSize >= 5 ? '5v5+' : `${cohort.teamSize}v${cohort.teamSize}`;
  return `${ruleset} ${teams}`;
}

/**
 * The map's games against the fifths of its cohort's distribution. A map that
 * plays like its cohort reads as five bars at the typical share; the shape of
 * the departure is the whole message, so the y axis always reaches past it.
 */
function ClosenessBars({
  bins,
  narrow,
}: {
  bins: QuintileBin[];
  narrow: boolean;
}) {
  const maxShare = Math.max(...bins.map((bin) => bin.share));
  const yMax = Math.max(30, Math.ceil((maxShare + 5) / 10) * 10);
  const step = yMax > 50 ? 20 : 10;
  const yTicks = Array.from(
    { length: Math.floor(yMax / step) + 1 },
    (_, index) => index * step
  );

  return (
    <div className="space-y-1">
      {/* Legend, not an in-chart label: no band of the plot is guaranteed clear
          of bars, so a floating label would read against one. */}
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span
          className="w-4 border-t border-dashed border-muted-foreground"
          aria-hidden="true"
        />
        typical share
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[200px] w-full"
      >
        <BarChart data={bins} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            // Every other range on phones: five of these labels overlap in
            // 286px, and an even alternation reads as deliberate where
            // Recharts' own gap-based dropping leaves a hole in the middle.
            interval={narrow ? 1 : 0}
          />
          <YAxis
            width={40}
            domain={[0, yMax]}
            ticks={yTicks}
            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => `${value}%`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(label) => `${label} score gap`}
                formatter={(_value, _name, item) => {
                  const bin = (item as { payload?: QuintileBin } | undefined)
                    ?.payload;
                  if (!bin) return null;
                  return (
                    <span className="font-medium text-foreground">
                      {gamesLabel(bin.count)} · {Math.round(bin.share)}%
                    </span>
                  );
                }}
              />
            }
          />
          <ReferenceLine
            y={TYPICAL_SHARE}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
          />
          <Bar
            dataKey="share"
            fill="var(--chart-1)"
            radius={CHART_CONSTANTS.BORDER_RADIUS}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

/**
 * One dot per game against the cohort's middle 80%. The x domain is fitted to
 * whichever of the band and the dots reaches further — a fixed domain in z
 * would collapse the mania band to a sliver, which is the failure this card was
 * rebuilt to fix.
 */
function ClosenessDots({
  dots,
  deciles,
  cohort,
}: {
  dots: ClosenessDot[];
  deciles: number[];
  cohort: ClosenessCohort;
}) {
  const values = [deciles[0], deciles[8], ...dots.map((dot) => dot.z)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.06 || 0.5;

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-[220px] w-full"
    >
      <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
        <XAxis
          type="number"
          dataKey="z"
          domain={[min - padding, max + padding]}
          ticks={[deciles[0], deciles[4], deciles[8]]}
          interval="preserveStartEnd"
          minTickGap={16}
          tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) =>
            formatMargin(marginPercent(value, cohort))
          }
        />
        <YAxis type="number" dataKey="y" domain={[-1, 1]} hide />
        <ReferenceArea
          x1={deciles[0]}
          x2={deciles[8]}
          fill="var(--chart-1)"
          fillOpacity={0.1}
        />
        <ReferenceLine
          x={deciles[4]}
          stroke="var(--muted-foreground)"
          strokeDasharray="4 4"
        />
        <ChartTooltip
          cursor={false}
          // Scatter always emits an x and a y row; the y one carries nothing
          // here, and collapsing the payload drops its blank line.
          payloadUniqBy={() => 'game'}
          content={
            <ChartTooltipContent
              hideIndicator
              hideLabel
              formatter={(_value, _name, item) => {
                const dot = (item as { payload?: ClosenessDot } | undefined)
                  ?.payload;
                if (!dot) return null;
                return (
                  <span className="font-medium text-foreground">
                    {formatMargin(dot.margin)} score gap
                  </span>
                );
              }}
            />
          }
        />
        <Scatter
          data={dots}
          fill="var(--chart-1)"
          fillOpacity={0.85}
          isAnimationActive={false}
        />
      </ScatterChart>
    </ChartContainer>
  );
}

export default function BeatmapMarginCard({
  closeness,
  className,
}: BeatmapMarginCardProps) {
  const narrow = useIsNarrowChart();
  const { bins, cohort, gameCount, games, percentile } = closeness;
  const deciles = closeness.baselineZDeciles;

  const quintiles = React.useMemo<QuintileBin[] | null>(() => {
    if (!cohort || !deciles || bins.length !== deciles.length + 1) return null;

    const total = bins.reduce((sum, count) => sum + count, 0);
    if (total === 0) return null;

    return Array.from({ length: 5 }, (_, index) => {
      const lower = () =>
        formatMarginValue(marginPercent(deciles[index * 2 - 1], cohort));
      const upper = () =>
        formatMargin(marginPercent(deciles[index * 2 + 1], cohort));
      const count = bins[index * 2] + bins[index * 2 + 1];

      return {
        label:
          index === 0
            ? `<${upper()}`
            : index === 4
              ? `${lower()}%+`
              : `${lower()}–${upper()}`,
        count,
        share: (count / total) * 100,
      };
    });
  }, [bins, cohort, deciles]);

  const dots = React.useMemo<ClosenessDot[]>(
    () =>
      games.map((game) => ({
        z: game.z,
        y: 0,
        margin: (1 - Math.exp(-game.logRatio)) * 100,
      })),
    [games]
  );

  const caption: string[] = [];
  if (cohort) {
    if (quintiles === null) {
      caption.push(
        `Each dot is one game's winning score gap. The band covers the middle 80% of ${cohortLabel(cohort)} games.`
      );
    } else if (percentile != null && closeness.percentileInterval) {
      const [low, high] = closeness.percentileInterval;
      caption.push(
        `Typical score gaps here are larger than on ${Math.round(percentile)}% of comparable ${cohortLabel(cohort)} maps (80% range ${Math.round(low)}–${Math.round(high)}%).`
      );
    } else {
      caption.push(
        `Not yet enough games to compare this map with other ${cohortLabel(cohort)} maps.`
      );
    }
  }
  if (closeness.excludedUnverifiedGameCount > 0) {
    const excluded = closeness.excludedUnverifiedGameCount;
    caption.push(
      `${formatChartNumber(excluded)} unverified ${excluded === 1 ? 'game' : 'games'} excluded.`
    );
  }

  return (
    <SectionCard data-testid="beatmap-margin" className={cn(className)}>
      <SectionHeader
        icon={Swords}
        title="Game closeness"
        meta={
          gameCount === 0
            ? undefined
            : percentile != null
              ? `${ordinal(Math.round(percentile))} percentile spread · ${gamesLabel(gameCount)}`
              : gamesLabel(gameCount)
        }
      />
      {gameCount === 0 || !cohort || !deciles ? (
        <EmptyState>
          {closeness.excludedUnverifiedGameCount > 0
            ? `No verified team-vs games. ${formatChartNumber(closeness.excludedUnverifiedGameCount)} ${closeness.excludedUnverifiedGameCount === 1 ? 'game is' : 'games are'} unverified or rejected.`
            : 'No team-vs games recorded for this beatmap.'}
        </EmptyState>
      ) : (
        <div className="space-y-3 px-4 py-4">
          {quintiles ? (
            <ClosenessBars bins={quintiles} narrow={narrow} />
          ) : (
            <ClosenessDots dots={dots} deciles={deciles} cohort={cohort} />
          )}
          <p className="text-xs text-muted-foreground">{caption.join(' ')}</p>
        </div>
      )}
    </SectionCard>
  );
}

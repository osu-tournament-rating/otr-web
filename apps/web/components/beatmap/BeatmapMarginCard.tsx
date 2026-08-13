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
  Symbols,
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
import {
  getClosenessStrip,
  type ClosenessStrip,
  type ClosenessStripDot,
} from '@/lib/beatmaps/closeness-strip';
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
type ClosenessRuleset = BeatmapClosenessSummary['games'][number]['ruleset'];

interface QuintileBin {
  label: string;
  count: number;
  /** Percent of the map's games, so the flat profile sits at 20. */
  share: number;
}

/** Share a map plays at when it matches its cohort exactly. */
const TYPICAL_SHARE = 20;

/** Vertical room per stacked dot, and the floor a single row still fills. */
const DOT_PITCH = 12;
const MIN_STRIP = 36;
/** Recharts geometry around the plot: 8px top margin + 30px x axis. */
const STRIP_CHROME = 38;

/** Recharts' own default symbol area, kept for the circles. */
const DOT_AREA = 64;

const chartConfig: ChartConfig = {
  share: {
    label: 'Share',
    color: 'var(--chart-1)',
  },
};

/** Reads a log ratio back as the winning-score gap it came from. */
function gapPercent(logRatio: number) {
  return (1 - Math.exp(-logRatio)) * 100;
}

/**
 * Reads a standardized value back as a gap through the dominant cohort's
 * baseline. Score gaps are what the reader thinks in, and they are 21x wider in
 * osu! than in mania 4K, so the axis cannot speak in z.
 */
function marginPercent(z: number, cohort: ClosenessCohort) {
  return gapPercent(z * cohort.sdLogRatio + cohort.meanLogRatio);
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

/** A single (ruleset, team size) cohort: `osu! 3v3`. */
function cohortName(ruleset: ClosenessRuleset, teamSize: number) {
  const teams = teamSize >= 5 ? '5v5+' : `${teamSize}v${teamSize}`;
  return `${RulesetEnumHelper.getMetadata(ruleset).text} ${teams}`;
}

/**
 * Names the population the baseline was fitted over rather than the cohort the
 * map played. A cell with too few corpus games falls back to its ruleset or to
 * the whole corpus, and the legend would otherwise claim a band nobody
 * measured.
 */
function cohortLabel(cohort: ClosenessCohort) {
  if (cohort.baselineScope === 'global') return 'tournament';
  if (cohort.baselineScope === 'ruleset')
    return RulesetEnumHelper.getMetadata(cohort.ruleset).text;
  return cohortName(cohort.ruleset, cohort.teamSize);
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
 * One dot per game against the cohort's middle 80%, plotted in log ratio — the
 * one scale on which a dot's position and its own tooltip number agree even
 * when the map's games span several cohorts. `getClosenessStrip` owns the
 * layout: clamping, stacking and the domain.
 */
function ClosenessDots({
  strip,
  bandLabel,
}: {
  strip: ClosenessStrip;
  bandLabel: string;
}) {
  const stripHeight = Math.max(MIN_STRIP, DOT_PITCH * strip.rows);

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {/* A 1px full-opacity edge, because the 10% fill alone measures
              1.14:1 against the card — far under the 3:1 floor. */}
          <span
            className="h-2.5 w-4 rounded-[2px] border border-chart-1 bg-chart-1/10"
            aria-hidden="true"
          />
          middle 80% of {bandLabel} games
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 border-t border-dashed border-muted-foreground"
            aria-hidden="true"
          />
          typical
        </span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto w-full"
        style={{ height: stripHeight + STRIP_CHROME }}
      >
        <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <XAxis
            type="number"
            dataKey="plotLr"
            domain={strip.domain}
            ticks={[strip.band.lo, strip.band.mid, strip.band.hi]}
            // Every tick or none: dropping by gap silently unlabelled the
            // dashed typical line whenever an outlier squeezed the band.
            interval={0}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => formatMargin(gapPercent(value))}
          />
          {/* y carries the stacking row, so coincident games stay separately
              hoverable instead of hiding one another. */}
          <YAxis
            type="number"
            dataKey="row"
            domain={[-0.5, strip.rows - 0.5]}
            hide
          />
          <ReferenceArea
            x1={strip.band.lo}
            x2={strip.band.hi}
            fill="var(--chart-1)"
            fillOpacity={0.1}
            stroke="var(--chart-1)"
            strokeWidth={1}
          />
          <ReferenceLine
            x={strip.band.mid}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
          />
          <ChartTooltip
            cursor={false}
            // Scatter always emits an x and a y row; the y one carries the
            // stacking index, and collapsing the payload drops its blank line.
            payloadUniqBy={() => 'game'}
            content={
              <ChartTooltipContent
                hideIndicator
                hideLabel
                formatter={(_value, _name, item) => {
                  const dot = (
                    item as { payload?: ClosenessStripDot } | undefined
                  )?.payload;
                  if (!dot) return null;
                  return (
                    <div className="grid gap-0.5">
                      <span className="font-medium text-foreground">
                        {formatMargin(dot.gap)} score gap
                      </span>
                      {dot.cohortNote ? (
                        <span className="text-muted-foreground">
                          {dot.cohortNote}
                        </span>
                      ) : null}
                      {dot.clamped ? (
                        <span className="text-muted-foreground">
                          Beyond the axis
                        </span>
                      ) : null}
                    </div>
                  );
                }}
              />
            }
          />
          <Scatter
            data={strip.dots}
            fill="var(--chart-1)"
            fillOpacity={0.85}
            isAnimationActive={false}
            // A pinned dot gets a triangle pointing off the edge it sits on,
            // the same "continues past here" mark the box plots and the score
            // scatter use.
            shape={(props) => {
              const dot = props.payload as ClosenessStripDot | undefined;

              return dot?.clamped ? (
                <g
                  transform={`rotate(${dot.clamped === 'low' ? -90 : 90} ${props.cx} ${props.cy})`}
                >
                  <Symbols
                    {...props}
                    type="triangle"
                    size={DOT_AREA}
                    sizeType="area"
                  />
                </g>
              ) : (
                <Symbols
                  {...props}
                  type="circle"
                  size={DOT_AREA}
                  sizeType="area"
                />
              );
            }}
          />
        </ScatterChart>
      </ChartContainer>
    </div>
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

  const strip = React.useMemo(
    () =>
      cohort && deciles && quintiles === null
        ? getClosenessStrip(games, cohort, deciles, cohortName)
        : null,
    [cohort, deciles, games, quintiles]
  );

  const caption: string[] = [];
  if (strip) {
    caption.push(
      "Each dot is one game's winning score gap. Not yet enough games to give this map a percentile."
    );
    if (strip.clampedCount > 0) {
      const clamped = strip.clampedCount;
      caption.push(
        `${formatChartNumber(clamped)} ${clamped === 1 ? 'game sits' : 'games sit'} beyond the axis, pinned to its edge.`
      );
    }
  } else if (cohort) {
    if (percentile != null && closeness.percentileInterval) {
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

  return (
    <SectionCard data-testid="beatmap-margin" className={cn(className)}>
      <SectionHeader
        icon={Swords}
        title="Game closeness"
        infoText="A low percentile means the winning and losing scores on this map usually finish closer together than on comparable maps, and a high percentile means they usually finish further apart. Verified team-vs games only."
        meta={
          gameCount === 0
            ? undefined
            : percentile != null
              ? `${ordinal(Math.round(percentile))} percentile spread · ${gamesLabel(gameCount)}`
              : gamesLabel(gameCount)
        }
      />
      {gameCount === 0 || !cohort || !deciles ? (
        <EmptyState />
      ) : (
        <div className="space-y-3 px-4 py-4">
          {quintiles ? (
            <ClosenessBars bins={quintiles} narrow={narrow} />
          ) : strip ? (
            <ClosenessDots strip={strip} bandLabel={cohortLabel(cohort)} />
          ) : null}
          <p className="text-xs text-muted-foreground">{caption.join(' ')}</p>
        </div>
      )}
    </SectionCard>
  );
}

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

import { NotEnoughData } from '@/components/beatmap/BeatmapSection';
import { GAME_CLOSENESS_INFO } from '@/components/beatmap/section-info';
import {
  ChartTooltipCard,
  ChartTooltipContent,
  type ChartTooltipPayloadItem,
} from '@/components/kit/charts/ChartTooltip';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  getClosenessStrip,
  type ClosenessStrip,
  type ClosenessStripDot,
} from '@/lib/beatmaps/closeness-strip';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
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
import { formatPercentTick } from '@/lib/kit/charts/format';
import { getNiceTicks } from '@/lib/kit/charts/ticks';
import {
  formatCount,
  formatCountOf,
  formatPercent,
  formatPercentile,
} from '@/lib/kit/format/number';
import { getRulesetLabel } from '@/lib/kit/format/ruleset';
import type { BeatmapClosenessSummary } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapMarginCardProps {
  closeness: BeatmapClosenessSummary;
  className?: string;
}

type ClosenessCohort = NonNullable<BeatmapClosenessSummary['cohort']>;
type ClosenessRuleset = BeatmapClosenessSummary['games'][number]['ruleset'];

interface QuintileBin {
  label: string;
  count: number;
  /** Percent of the map's games. */
  share: number;
}

/** Share a map plays at when it matches its cohort exactly. */
const TYPICAL_SHARE = 20;

const DOT_PITCH = 12;
const MIN_STRIP = 36;
// Recharts geometry around the plot: 8px top margin + 30px x axis.
const STRIP_CHROME = 38;
// Recharts' own default symbol area.
const DOT_AREA = 64;

/** The one series on both charts: the categorical palette's first slot. */
const SERIES_COLOR = seriesColor(0);

const chartConfig: ChartConfig = {
  share: {
    label: 'Share',
    color: SERIES_COLOR,
  },
};

/** Reads a log ratio back as the winning-score gap it came from. */
function gapPercent(logRatio: number) {
  return (1 - Math.exp(-logRatio)) * 100;
}

/** Reads a standardized value back as a gap through the cohort's baseline. */
function marginPercent(z: number, cohort: ClosenessCohort) {
  return gapPercent(z * cohort.sdLogRatio + cohort.meanLogRatio);
}

/** Two significant figures. */
function formatMarginValue(value: number) {
  const percent = Math.max(0, value);
  return percent.toFixed(percent >= 10 ? 0 : percent >= 1 ? 1 : 2);
}

function formatMargin(value: number) {
  return `${formatMarginValue(value)}%`;
}

/** The whole number the header's ordinal shows: rounded down, 1–99. */
function wholePercentile(value: number) {
  return Math.min(99, Math.max(1, Math.floor(value)));
}

function gamesLabel(count: number) {
  return formatCountOf(count, 'game');
}

/** A single (ruleset, team size) cohort: `osu! 3v3`. */
function cohortName(ruleset: ClosenessRuleset, teamSize: number) {
  const teams = teamSize >= 5 ? '5v5+' : `${teamSize}v${teamSize}`;
  return `${getRulesetLabel(ruleset)} ${teams}`;
}

/** Names the population the baseline was fitted over, not the cohort played. */
function cohortLabel(cohort: ClosenessCohort) {
  if (cohort.baselineScope === 'global') return 'tournament';
  if (cohort.baselineScope === 'ruleset')
    return getRulesetLabel(cohort.ruleset);
  return cohortName(cohort.ruleset, cohort.teamSize);
}

function Field({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

function ClosenessBars({
  bins,
  narrow,
}: {
  bins: QuintileBin[];
  narrow: boolean;
}) {
  const maxShare = Math.max(...bins.map((bin) => bin.share));
  // Room above the tallest bar, and never so low the typical line sits on top.
  const yTicks = getNiceTicks(0, Math.max(30, maxShare + 5));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
        <span
          className="w-4 border-t border-dashed border-muted-foreground"
          aria-hidden="true"
        />
        Typical share
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-[200px] w-full"
      >
        <BarChart data={bins} margin={CHART_MARGIN}>
          <CartesianGrid {...chartGridProps} />
          <XAxis
            {...chartAxisProps}
            dataKey="label"
            // Alternate on phones; five of these labels overlap at 286px.
            interval={narrow ? 1 : 0}
          />
          <YAxis
            {...chartValueAxisProps}
            {...niceAxisProps(yTicks)}
            tickFormatter={formatPercentTick}
          />
          <ChartTooltip
            cursor={CHART_CURSOR.bar}
            content={
              <ChartTooltipContent
                labelFormatter={(label) => `${label} score gap`}
                nameFormatter={() => 'Share of games'}
                valueFormatter={(value) =>
                  formatPercent(value / 100, { decimals: 0 })
                }
                footer={(payload) => {
                  const bin = payload[0]?.payload as QuintileBin | undefined;
                  return bin ? gamesLabel(bin.count) : null;
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
            name="Share of games"
            fill={SERIES_COLOR}
            radius={CHART_BAR_RADIUS}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

/** One game's winning score gap, with the notes the strip draws as shapes. */
function DotTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly ChartTooltipPayloadItem[];
}) {
  const dot = payload?.[0]?.payload as ClosenessStripDot | undefined;
  if (!active || !dot) return null;

  const notes = [dot.cohortNote, dot.clamped ? 'Beyond the axis' : null].filter(
    Boolean
  );

  return (
    <ChartTooltipCard
      title={`${formatMargin(dot.gap)} score gap`}
      rows={[]}
      footer={notes.length > 0 ? notes.join(' · ') : undefined}
    />
  );
}

/** One dot per game against the cohort's middle 80%, plotted in log ratio. */
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
          <span
            className="h-2.5 w-4 rounded-xs border"
            style={{
              borderColor: SERIES_COLOR,
              backgroundColor: `color-mix(in oklab, ${SERIES_COLOR} 10%, transparent)`,
            }}
            aria-hidden="true"
          />
          Middle 80% of {bandLabel} games
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-4 border-t border-dashed border-muted-foreground"
            aria-hidden="true"
          />
          Typical
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
            // Every tick or none; gap-dropping unlabels the typical line.
            interval={0}
            {...chartAxisProps}
            tickFormatter={(value: number) => formatMargin(gapPercent(value))}
          />
          {/* y carries the stacking row so coincident games stay hoverable */}
          <YAxis
            type="number"
            dataKey="row"
            domain={[-0.5, strip.rows - 0.5]}
            hide
          />
          <ReferenceArea
            x1={strip.band.lo}
            x2={strip.band.hi}
            fill={SERIES_COLOR}
            fillOpacity={0.1}
            stroke={SERIES_COLOR}
            strokeWidth={1}
          />
          <ReferenceLine
            x={strip.band.mid}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
          />
          <ChartTooltip
            cursor={false}
            // Scatter emits an x and a y row; collapse them into one.
            payloadUniqBy={() => 'game'}
            content={<DotTooltip />}
          />
          <Scatter
            data={strip.dots}
            fill={SERIES_COLOR}
            fillOpacity={0.85}
            isAnimationActive={false}
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

  const caption: React.ReactNode[] = [];
  if (strip) {
    caption.push(
      "Each dot is one game's winning score gap. Not yet enough games to give this map a percentile."
    );
    if (strip.clampedCount > 0) {
      const clamped = strip.clampedCount;
      caption.push(
        <>
          <Field>{formatCount(clamped)}</Field>{' '}
          {clamped === 1 ? 'game sits' : 'games sit'} beyond the axis, pinned to
          its edge.
        </>
      );
    }
  } else if (cohort) {
    if (percentile != null) {
      caption.push(
        <>
          Winning scores here finish further ahead than on{' '}
          <Field>{wholePercentile(percentile)}%</Field> of all other{' '}
          <Field>{cohortLabel(cohort)}</Field> maps.
        </>
      );
    } else {
      caption.push(
        <>
          Not yet enough games to rank this map against other{' '}
          <Field>{cohortLabel(cohort)}</Field> maps.
        </>
      );
    }
  }

  return (
    <Panel data-testid="beatmap-margin" className={className}>
      <SectionHeader
        icon={Swords}
        title="Game closeness"
        infoText={GAME_CLOSENESS_INFO}
        meta={
          gameCount === 0
            ? undefined
            : percentile != null
              ? `${formatPercentile(percentile)} spread · ${gamesLabel(gameCount)}`
              : gamesLabel(gameCount)
        }
      />
      {gameCount === 0 || !cohort || !deciles ? (
        <NotEnoughData />
      ) : (
        <div className="space-y-3 px-4 py-4">
          {quintiles ? (
            <ClosenessBars bins={quintiles} narrow={narrow} />
          ) : strip ? (
            <ClosenessDots strip={strip} bandLabel={cohortLabel(cohort)} />
          ) : null}
          <p className="text-xs text-muted-foreground">
            {caption.map((sentence, index) => (
              <React.Fragment key={index}>
                {index > 0 ? ' ' : null}
                {sentence}
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </Panel>
  );
}

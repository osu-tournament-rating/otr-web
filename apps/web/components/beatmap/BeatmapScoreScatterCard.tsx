'use client';

import { ChartScatter, EyeOff } from 'lucide-react';
import * as React from 'react';
import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Symbols,
  XAxis,
  YAxis,
} from 'recharts';

import { NotEnoughData } from '@/components/beatmap/BeatmapSection';
import { ChartTooltipContent } from '@/components/kit/charts/ChartTooltip';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { formatScoreTick, getScatterAxis } from '@/lib/beatmaps/chart-axis';
import {
  RANK_RANGE_BUCKETS,
  type RankRangeBucketDef,
  type RankRangeBucketKey,
} from '@/lib/beatmaps/rankRange';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import type { BeatmapScoreSample } from '@/lib/orpc/schema/beatmapStats';
import {
  CHART_CURSOR,
  chartAxisProps,
  chartGridProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';
import { formatCountTick } from '@/lib/kit/charts/format';
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  getNiceTicks,
} from '@/lib/kit/charts/ticks';
import { formatCount, formatCountOf } from '@/lib/kit/format/number';
import { cn } from '@/lib/utils';
import { getBeatmapModLabel } from '@/lib/utils/mods';

interface BeatmapScoreScatterCardProps {
  sample: BeatmapScoreSample;
  className?: string;
}

interface ScatterPoint {
  score: number;
  /** Score lifted onto the axis floor. */
  plotScore: number;
  /** Score fell below the axis floor and is drawn pinned to it. */
  clamped: boolean;
  rating: number;
  modLabel: string;
  rankRange: RankRangeBucketKey;
  rankRangeLabel: string;
}

interface RangeSeries {
  bucket: RankRangeBucketDef;
  points: ScatterPoint[];
}

interface RangeTrend {
  /** Score per point of rating. */
  slope: number;
  segment: [{ x: number; y: number }, { x: number; y: number }];
}

// Two fitted parameters at ten observations each.
const TREND_MIN_POINTS_PER_RANGE = 20;

// Recharts 3 ignores `ZAxis range` without a `dataKey`, so sizing goes
// through `Symbols`. Values are symbol areas.
const DOT_AREA_WIDE = 64;
const DOT_AREA_NARROW = 30;
const KEY_SYMBOL_AREA = 28;

const BUCKET_BY_KEY = Object.fromEntries(
  RANK_RANGE_BUCKETS.map((bucket) => [bucket.key, bucket])
) as Record<RankRangeBucketKey, RankRangeBucketDef>;

/** Least-squares fit; null under two points or with zero x-variance. */
function linearRegression(
  points: Array<{ x: number; y: number }>
): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXX += x * x;
    sumXY += x * y;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  if (!Number.isFinite(slope) || !Number.isFinite(intercept)) return null;

  return { slope, intercept };
}

/**
 * The kit chart tooltip for one score: its rank restriction as the title,
 * rating and score as rows, and its mods underneath. A pinned point reports
 * its real score, not the floor it is drawn on.
 */
function ScatterTooltip(
  props: React.ComponentProps<typeof ChartTooltipContent>
) {
  const point = props.payload?.[0]?.payload as ScatterPoint | undefined;

  return (
    <ChartTooltipContent
      {...props}
      // Scatter tooltips carry no x label; the title comes from the point.
      label=""
      marker="dot"
      labelFormatter={() =>
        point ? (
          <span className="flex items-center gap-1.5">
            <RankRangeKey bucket={BUCKET_BY_KEY[point.rankRange]} />
            {point.rankRangeLabel}
          </span>
        ) : null
      }
      valueFormatter={(value, item) => {
        const scored = item.payload as ScatterPoint | undefined;
        return item.name === 'Score' && scored
          ? formatCount(scored.score)
          : formatCount(value);
      }}
      footer={() =>
        point
          ? `Mods ${point.modLabel}${point.clamped ? ' · below the chart floor' : ''}`
          : null
      }
    />
  );
}

function RankRangeKey({
  bucket,
  hollow = false,
  withLine = false,
}: {
  bucket: RankRangeBucketDef;
  hollow?: boolean;
  withLine?: boolean;
}) {
  const width = withLine ? 28 : 10;

  return (
    <svg
      width={width}
      height={10}
      viewBox={`0 0 ${width} 10`}
      className="shrink-0 overflow-visible"
      aria-hidden="true"
    >
      {withLine ? (
        <line
          x1={0}
          y1={5}
          x2={width}
          y2={5}
          stroke={bucket.color}
          strokeWidth={2}
          strokeDasharray={bucket.dash}
          strokeLinecap={bucket.dashLinecap}
        />
      ) : null}
      <Symbols
        cx={width / 2}
        cy={5}
        type={bucket.symbol}
        size={KEY_SYMBOL_AREA}
        sizeType="area"
        fill={hollow ? 'none' : bucket.color}
        stroke={bucket.color}
        strokeWidth={hollow ? 1.5 : 1}
      />
    </svg>
  );
}

function RankRangeLegend({
  entries,
  hidden,
  onToggle,
}: {
  entries: Array<{
    bucket: RankRangeBucketDef;
    count: number;
    hasTrend: boolean;
  }>;
  hidden: ReadonlySet<RankRangeBucketKey>;
  onToggle: (key: RankRangeBucketKey) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <ul
      aria-label="Rank restrictions"
      className="flex flex-wrap gap-x-2 gap-y-1 text-xs"
    >
      {entries.map(({ bucket, count, hasTrend }) => {
        const isHidden = hidden.has(bucket.key);
        return (
          <li key={bucket.key}>
            <button
              type="button"
              aria-pressed={!isHidden}
              onClick={() => onToggle(bucket.key)}
              title={
                isHidden
                  ? `Show ${bucket.label} scores`
                  : `Hide ${bucket.label} scores`
              }
              className={cn(
                'flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-1.5 transition-colors',
                'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                isHidden && 'opacity-50'
              )}
            >
              <RankRangeKey
                bucket={bucket}
                hollow={isHidden}
                withLine={hasTrend}
              />
              <span className="font-medium">{bucket.label}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatCount(count)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function BeatmapScoreScatterCard({
  sample,
  className,
}: BeatmapScoreScatterCardProps) {
  const isNarrow = useIsNarrowChart();
  const dotArea = isNarrow ? DOT_AREA_NARROW : DOT_AREA_WIDE;
  const [hiddenRanges, setHiddenRanges] = React.useState<
    ReadonlySet<RankRangeBucketKey>
  >(new Set());

  const toggleRange = React.useCallback((key: RankRangeBucketKey) => {
    setHiddenRanges((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const { ratedPoints, scoreAxis, clampedCount } = React.useMemo(() => {
    const rated = sample.points.filter((point) => point.rating != null);
    const axis = getScatterAxis(rated.map((point) => point.score));

    if (axis === null) {
      return {
        ratedPoints: [] as ScatterPoint[],
        scoreAxis: null,
        clampedCount: 0,
      };
    }

    const points = rated.map<ScatterPoint>((point) => ({
      score: point.score,
      plotScore: Math.max(point.score, axis.floor),
      clamped: point.score < axis.floor,
      rating: point.rating as number,
      modLabel: getBeatmapModLabel(point.mods),
      rankRange: point.rankRange,
      rankRangeLabel: BUCKET_BY_KEY[point.rankRange].label,
    }));

    return {
      ratedPoints: points,
      scoreAxis: axis,
      clampedCount: points.filter((point) => point.clamped).length,
    };
  }, [sample.points]);
  const unratedCount = sample.points.length - ratedPoints.length;

  const series = React.useMemo<RangeSeries[]>(() => {
    const grouped = new Map<RankRangeBucketKey, ScatterPoint[]>();
    for (const point of ratedPoints) {
      const existing = grouped.get(point.rankRange);
      if (existing) {
        existing.push(point);
      } else {
        grouped.set(point.rankRange, [point]);
      }
    }

    return RANK_RANGE_BUCKETS.flatMap((bucket) => {
      const points = grouped.get(bucket.key);
      return points ? [{ bucket, points }] : [];
    });
  }, [ratedPoints]);

  const visibleSeries = React.useMemo(
    () => series.filter(({ bucket }) => !hiddenRanges.has(bucket.key)),
    [series, hiddenRanges]
  );

  const ratingAxis = React.useMemo(() => {
    if (ratedPoints.length === 0) return null;

    const ratings = ratedPoints.map((point) => point.rating);
    return getNiceTicks(Math.min(...ratings), Math.max(...ratings), {
      maxTicks: isNarrow ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS,
    });
  }, [ratedPoints, isNarrow]);

  const trends = React.useMemo(() => {
    const fits = new Map<RankRangeBucketKey, RangeTrend>();

    for (const { bucket, points } of series) {
      if (points.length < TREND_MIN_POINTS_PER_RANGE) continue;

      // Fit the scores that were set, not the pinned ones.
      const fit = linearRegression(
        points.map((point) => ({ x: point.rating, y: point.score }))
      );
      if (fit === null) continue;

      const ratings = points.map((point) => point.rating);
      const from = Math.min(...ratings);
      const to = Math.max(...ratings);

      fits.set(bucket.key, {
        slope: fit.slope,
        segment: [
          { x: from, y: fit.slope * from + fit.intercept },
          { x: to, y: fit.slope * to + fit.intercept },
        ],
      });
    }

    return fits;
  }, [series]);

  const legendEntries = React.useMemo(
    () =>
      series.map(({ bucket, points }) => ({
        bucket,
        count: points.length,
        hasTrend: trends.has(bucket.key),
      })),
    [series, trends]
  );

  const chartDescription = React.useMemo(() => {
    if (series.length === 0) return '';

    const ranges = series.map(({ bucket, points }) => {
      const count = `${bucket.label}: ${formatCountOf(points.length, 'score')}`;
      const trend = trends.get(bucket.key);
      if (!trend) return `${count}, too few for a trend line.`;

      const per100 = Math.round(trend.slope * 100);
      if (per100 === 0) return `${count}, trend is flat.`;

      return `${count}, trend ${per100 > 0 ? 'rises' : 'falls'} about ${formatCount(Math.abs(per100))} score per 100 rating.`;
    });

    return `${formatCountOf(ratedPoints.length, 'score')} plotted against pre-match rating. ${ranges.join(' ')}`;
  }, [series, trends, ratedPoints.length]);

  const meta =
    sample.points.length < sample.totalScoreCount
      ? `${formatCount(sample.points.length)} of ${formatCountOf(sample.totalScoreCount, 'score')}`
      : formatCountOf(sample.points.length, 'score');

  const footnote: string[] = [];
  if (unratedCount > 0) {
    footnote.push(
      `${formatCountOf(unratedCount, 'score')} without pre-match ratings hidden`
    );
  }
  if (clampedCount > 0) {
    footnote.push(
      `${formatCountOf(clampedCount, 'low outlier')} pinned to the axis floor`
    );
  }

  return (
    <Panel data-testid="beatmap-score-scatter" className={className}>
      <SectionHeader icon={ChartScatter} title="Score scatter" meta={meta} />
      {sample.points.length === 0 ? (
        <NotEnoughData />
      ) : ratedPoints.length === 0 ||
        ratingAxis === null ||
        scoreAxis === null ? (
        <div className="flex h-[300px] items-center justify-center px-4">
          <NotEnoughData />
        </div>
      ) : (
        <div className="space-y-3 px-4 py-4">
          <RankRangeLegend
            entries={legendEntries}
            hidden={hiddenRanges}
            onToggle={toggleRange}
          />
          <p className="sr-only">{chartDescription}</p>
          {visibleSeries.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <EmptyState
                size="compact"
                icon={EyeOff}
                title="All rank restrictions are hidden"
                description="Select one above to show scores."
              />
            </div>
          ) : (
            <ChartContainer
              config={{}}
              className="aspect-auto h-[300px] w-full"
            >
              {/* No `title`: Recharts emits an SVG <title> that hijacks hover */}
              <ScatterChart
                // Room on the right for the last rating label on the edge.
                margin={{ top: 8, right: 24, bottom: 22, left: 0 }}
                desc={chartDescription}
              >
                <CartesianGrid {...chartGridProps} />
                <XAxis
                  {...chartAxisProps}
                  dataKey="rating"
                  name="Pre-match rating"
                  {...niceAxisProps(ratingAxis)}
                  tickFormatter={formatCountTick}
                  label={{
                    value: 'Pre-match rating',
                    position: 'insideBottom',
                    offset: -12,
                    fill: 'var(--muted-foreground)',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                />
                <YAxis
                  {...chartAxisProps}
                  dataKey="plotScore"
                  name="Score"
                  type="number"
                  domain={[scoreAxis.min, scoreAxis.max]}
                  ticks={scoreAxis.ticks}
                  interval={0}
                  tickFormatter={(value: number) => formatScoreTick(value)}
                  width={64}
                  label={{
                    value: 'Score',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 10,
                    fill: 'var(--muted-foreground)',
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                />
                <ChartTooltip
                  cursor={{ ...CHART_CURSOR.line, strokeDasharray: '3 3' }}
                  content={<ScatterTooltip />}
                />
                {visibleSeries.map(({ bucket, points }) => (
                  <Scatter
                    key={bucket.key}
                    data={points}
                    dataKey="plotScore"
                    fill={bucket.color}
                    fillOpacity={isNarrow ? 0.45 : 0.65}
                    stroke={bucket.color}
                    strokeWidth={1}
                    isAnimationActive={false}
                    shape={(props) => (
                      <Symbols
                        {...props}
                        type={bucket.symbol}
                        size={dotArea}
                        sizeType="area"
                        {...((props.payload as ScatterPoint | undefined)
                          ?.clamped
                          ? { fill: 'none', strokeWidth: 1.75 }
                          : null)}
                      />
                    )}
                  />
                ))}
                {visibleSeries.map(({ bucket }) => {
                  const trend = trends.get(bucket.key);
                  if (!trend) return null;

                  return (
                    <ReferenceLine
                      key={bucket.key}
                      segment={trend.segment}
                      stroke={bucket.color}
                      strokeWidth={2}
                      strokeDasharray={bucket.dash}
                      strokeLinecap={bucket.dashLinecap}
                      // Above the scatter (600), below the tooltip cursor (1100).
                      ifOverflow="hidden"
                      zIndex={900}
                    />
                  );
                })}
              </ScatterChart>
            </ChartContainer>
          )}
          {footnote.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {footnote.join(' · ')}
            </p>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

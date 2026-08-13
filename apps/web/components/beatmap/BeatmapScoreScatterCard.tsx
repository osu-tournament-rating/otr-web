'use client';

import { ChartScatter } from 'lucide-react';
import * as React from 'react';
import {
  CartesianGrid,
  Cell,
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
  Swatch,
} from '@/components/beatmap/BeatmapSection';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { formatScoreTick, getScatterAxis } from '@/lib/beatmaps/chart-axis';
import {
  RANK_RANGE_BUCKETS,
  type RankRangeBucketKey,
} from '@/lib/beatmaps/rankRange';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import type { BeatmapScoreSample } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatChartNumber } from '@/lib/utils/chart';
import { getBeatmapModLabel } from '@/lib/utils/mods';

interface BeatmapScoreScatterCardProps {
  sample: BeatmapScoreSample;
  className?: string;
}

interface ScatterPoint {
  /** The score that was actually set. Everything the reader is told uses this. */
  score: number;
  /** `score` lifted onto the axis floor, which is what the chart plots. */
  plotScore: number;
  /** `score` fell below the axis floor and is drawn pinned to it. */
  clamped: boolean;
  rating: number;
  modLabel: string;
  rankRange: RankRangeBucketKey;
  rankRangeLabel: string;
  fill: string;
}

/** Minimum rated points before a trendline is meaningful. */
const TRENDLINE_MIN_POINTS = 10;

/**
 * Scatter symbol AREA in px². Sizing goes through an explicit `Symbols` shape
 * because Recharts 3 ignores `ZAxis range` unless the axis also has a
 * `dataKey`, and giving it one would push an extra row into the tooltip. The
 * wide value is Recharts' own default (so wide viewports render unchanged);
 * the narrow one is ~0.68x that diameter so dense samples stay separable on
 * phones.
 */
const DOT_AREA_WIDE = 64;
const DOT_AREA_NARROW = 30;

const RANK_RANGE_COLOR = Object.fromEntries(
  RANK_RANGE_BUCKETS.map((bucket) => [bucket.key, bucket.color])
) as Record<RankRangeBucketKey, string>;

const RANK_RANGE_LABEL = Object.fromEntries(
  RANK_RANGE_BUCKETS.map((bucket) => [bucket.key, bucket.label])
) as Record<RankRangeBucketKey, string>;

/**
 * Least-squares fit over (x, y) pairs. Returns null when the input cannot
 * support a line (fewer than two points or zero x-variance).
 */
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
 * Clips the line y = slope * x + intercept to the data bounding box so the
 * rendered ReferenceLine segment never leaves the plotted area.
 */
function clipTrendSegment(
  { slope, intercept }: { slope: number; intercept: number },
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): [{ x: number; y: number }, { x: number; y: number }] | null {
  if (xMin >= xMax) return null;

  if (slope === 0) {
    if (intercept < yMin || intercept > yMax) return null;
    return [
      { x: xMin, y: intercept },
      { x: xMax, y: intercept },
    ];
  }

  const xAtYMin = (yMin - intercept) / slope;
  const xAtYMax = (yMax - intercept) / slope;
  const lo = Math.max(xMin, Math.min(xAtYMin, xAtYMax));
  const hi = Math.min(xMax, Math.max(xAtYMin, xAtYMax));

  if (!(lo < hi)) return null;

  // Snapping the endpoints back onto the bounds matters: ReferenceLine defaults
  // to `ifOverflow: 'discard'` and drops the whole segment if a rounding-dust
  // pixel lands outside the axis.
  const clampY = (value: number) => Math.min(yMax, Math.max(yMin, value));

  return [
    { x: lo, y: clampY(slope * lo + intercept) },
    { x: hi, y: clampY(slope * hi + intercept) },
  ];
}

function TooltipRow({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex w-full items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          muted ? 'text-muted-foreground' : 'font-medium text-foreground'
        }
      >
        {value}
      </span>
    </div>
  );
}

function RankRangeLegend({
  entries,
  hidden,
  onToggle,
}: {
  entries: Array<{ key: RankRangeBucketKey; label: string; count: number }>;
  hidden: ReadonlySet<RankRangeBucketKey>;
  onToggle: (key: RankRangeBucketKey) => void;
}) {
  if (entries.length === 0) return null;

  return (
    <ul
      aria-label="Rank ranges"
      className="flex flex-wrap gap-x-2 gap-y-1 text-xs"
    >
      {entries.map((entry) => {
        const isHidden = hidden.has(entry.key);
        return (
          <li key={entry.key}>
            <button
              type="button"
              aria-pressed={!isHidden}
              onClick={() => onToggle(entry.key)}
              title={
                isHidden
                  ? `Show ${entry.label} scores`
                  : `Hide ${entry.label} scores`
              }
              className={cn(
                'flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors',
                'hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                isHidden && 'opacity-50'
              )}
            >
              <span
                className="size-2 rounded-[2px]"
                style={{
                  backgroundColor: isHidden
                    ? 'transparent'
                    : RANK_RANGE_COLOR[entry.key],
                  boxShadow: isHidden
                    ? `inset 0 0 0 1.5px ${RANK_RANGE_COLOR[entry.key]}`
                    : undefined,
                }}
                aria-hidden="true"
              />
              <span className="font-medium">{entry.label}</span>
              <span className="text-muted-foreground">
                {formatChartNumber(entry.count)}
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

  /**
   * The score axis and the points are built together because each needs the
   * other: the axis floors on a low quantile (see `getScatterAxis`) and every
   * score below that floor is plotted on it, so one quit run cannot flatten the
   * whole field against the ceiling. Both read the full rated sample rather
   * than the visible one, so toggling a rank range filters points without
   * rescaling the axis under the reader.
   */
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
      rankRangeLabel: RANK_RANGE_LABEL[point.rankRange],
      fill: RANK_RANGE_COLOR[point.rankRange],
    }));

    return {
      ratedPoints: points,
      scoreAxis: axis,
      clampedCount: points.filter((point) => point.clamped).length,
    };
  }, [sample.points]);
  const unratedCount = sample.points.length - ratedPoints.length;

  const legendEntries = React.useMemo(() => {
    const counts = new Map<RankRangeBucketKey, number>();
    for (const point of ratedPoints) {
      counts.set(point.rankRange, (counts.get(point.rankRange) ?? 0) + 1);
    }
    return RANK_RANGE_BUCKETS.filter((bucket) => counts.has(bucket.key)).map(
      (bucket) => ({
        key: bucket.key,
        label: bucket.label,
        count: counts.get(bucket.key) ?? 0,
      })
    );
  }, [ratedPoints]);

  const visiblePoints = React.useMemo(
    () => ratedPoints.filter((point) => !hiddenRanges.has(point.rankRange)),
    [ratedPoints, hiddenRanges]
  );

  /** Ratings are charted as they fall, rounded outward onto a round step. */
  const ratingDomain = React.useMemo<[number, number] | null>(() => {
    if (ratedPoints.length === 0) return null;

    const ratings = ratedPoints.map((point) => point.rating);
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    const range = max - min;
    if (range === 0) return [min, max];

    const step = Math.pow(10, Math.floor(Math.log10(range / 4)));
    return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
  }, [ratedPoints]);

  const trendSegment = React.useMemo(() => {
    if (visiblePoints.length < TRENDLINE_MIN_POINTS || scoreAxis === null) {
      return null;
    }

    // Fitted on the scores that were actually set, clipped to the drawn axis:
    // a segment running off the floor would be discarded whole.
    const fit = linearRegression(
      visiblePoints.map((point) => ({ x: point.rating, y: point.score }))
    );
    if (fit === null) return null;

    const ratings = visiblePoints.map((point) => point.rating);

    return clipTrendSegment(
      fit,
      Math.min(...ratings),
      Math.max(...ratings),
      scoreAxis.min,
      scoreAxis.max
    );
  }, [visiblePoints, scoreAxis]);

  const meta =
    sample.points.length < sample.totalScoreCount
      ? `${sample.points.length} of ${formatChartNumber(sample.totalScoreCount)} scores`
      : `${formatChartNumber(sample.points.length)} scores`;

  const footnote: string[] = [];
  if (unratedCount > 0) {
    footnote.push(
      `${formatChartNumber(unratedCount)} scores without pre-match ratings hidden`
    );
  }
  if (clampedCount > 0) {
    footnote.push(
      `${formatChartNumber(clampedCount)} low outlier${clampedCount === 1 ? '' : 's'} pinned to the axis floor`
    );
  }

  return (
    <SectionCard data-testid="beatmap-score-scatter" className={cn(className)}>
      <SectionHeader icon={ChartScatter} title="Score scatter" meta={meta} />
      {sample.points.length === 0 ? (
        <EmptyState>No verified scores yet.</EmptyState>
      ) : ratedPoints.length === 0 ||
        ratingDomain === null ||
        scoreAxis === null ? (
        <div className="flex h-[300px] items-center justify-center px-4">
          <EmptyState>
            No pre-match ratings available for these scores yet.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-3 px-4 py-4">
          <RankRangeLegend
            entries={legendEntries}
            hidden={hiddenRanges}
            onToggle={toggleRange}
          />
          {visiblePoints.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <EmptyState>
                All rank ranges are hidden. Select one above to show scores.
              </EmptyState>
            </div>
          ) : (
            <ChartContainer
              config={{}}
              className="aspect-auto h-[300px] w-full"
            >
              <ScatterChart margin={{ top: 8, right: 12, bottom: 22, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="rating"
                  name="Pre-match rating"
                  type="number"
                  domain={ratingDomain}
                  tickFormatter={(value: number) =>
                    formatChartNumber(Math.round(value))
                  }
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
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
                  dataKey="plotScore"
                  name="Score"
                  type="number"
                  domain={[scoreAxis.min, scoreAxis.max]}
                  ticks={scoreAxis.ticks}
                  tickFormatter={(value: number) => formatScoreTick(value)}
                  tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
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
                  cursor={{ strokeDasharray: '3 3' }}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const point = payload?.[0]?.payload as
                          | ScatterPoint
                          | undefined;
                        if (!point) return null;
                        return (
                          <span className="flex items-center gap-1.5">
                            <Swatch color={point.fill} />
                            <span>{point.rankRangeLabel}</span>
                          </span>
                        );
                      }}
                      formatter={(value, name, item, index, entries) => {
                        const numeric =
                          typeof value === 'number' ? value : Number(value);
                        const isRating = name === 'Pre-match rating';
                        const point = (
                          item as { payload?: ScatterPoint } | undefined
                        )?.payload;
                        const isLastRow =
                          index ===
                          (Array.isArray(entries) ? entries.length : 1) - 1;
                        // The score row reads the raw payload: a pinned point
                        // is plotted at the floor but never reports it.
                        const shown = isRating
                          ? Math.round(numeric)
                          : (point?.score ?? numeric);

                        return (
                          <>
                            <TooltipRow
                              label={String(name)}
                              value={formatChartNumber(shown)}
                            />
                            {isLastRow && point ? (
                              <>
                                <TooltipRow
                                  label="Mods"
                                  value={point.modLabel}
                                />
                                {point.clamped ? (
                                  <TooltipRow
                                    label="Note"
                                    value="below chart floor"
                                    muted
                                  />
                                ) : null}
                              </>
                            ) : null}
                          </>
                        );
                      }}
                    />
                  }
                />
                {trendSegment ? (
                  <ReferenceLine
                    segment={trendSegment}
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 4"
                  />
                ) : null}
                <Scatter
                  data={visiblePoints}
                  dataKey="plotScore"
                  fillOpacity={isNarrow ? 0.45 : 0.65}
                  isAnimationActive={false}
                  // A point pinned to the floor gets a down-pointing triangle,
                  // the same "continues past the edge" mark the box plots use
                  // for a whisker the axis cut off. Per-Cell fills arrive in
                  // `props`, so both branches keep their rank-range color.
                  shape={(props) => {
                    const point = props.payload as ScatterPoint | undefined;

                    return point?.clamped ? (
                      <g transform={`rotate(180 ${props.cx} ${props.cy})`}>
                        <Symbols
                          {...props}
                          type="triangle"
                          size={dotArea}
                          sizeType="area"
                        />
                      </g>
                    ) : (
                      <Symbols
                        {...props}
                        type="circle"
                        size={dotArea}
                        sizeType="area"
                      />
                    );
                  }}
                >
                  {visiblePoints.map((point, index) => (
                    <Cell key={index} fill={point.fill} />
                  ))}
                </Scatter>
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
    </SectionCard>
  );
}

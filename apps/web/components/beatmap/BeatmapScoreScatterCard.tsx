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
} from '@/components/beatmap/BeatmapSection';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  RANK_RANGE_BUCKETS,
  type RankRangeBucketKey,
} from '@/lib/beatmaps/rankRange';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import type { BeatmapScoreSample } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatChartNumber, formatKilo } from '@/lib/utils/chart';
import { getBeatmapModLabel } from '@/lib/utils/mods';

interface BeatmapScoreScatterCardProps {
  sample: BeatmapScoreSample;
  className?: string;
}

interface ScatterPoint {
  score: number;
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

  return [
    { x: lo, y: slope * lo + intercept },
    { x: hi, y: slope * hi + intercept },
  ];
}

function TooltipRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full items-baseline justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
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
  const isNarrow = useMediaQuery('(max-width: 639px)');
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

  const ratedPoints = React.useMemo<ScatterPoint[]>(
    () =>
      sample.points
        .filter((point) => point.rating != null)
        .map((point) => ({
          score: point.score,
          rating: point.rating as number,
          modLabel: getBeatmapModLabel(point.mods),
          rankRange: point.rankRange,
          rankRangeLabel: RANK_RANGE_LABEL[point.rankRange],
          fill: RANK_RANGE_COLOR[point.rankRange],
        })),
    [sample.points]
  );
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

  /**
   * Axis bounds come from the full rated sample so toggling a rank range
   * filters points without rescaling the chart under the cursor. Bounds are
   * rounded outward to a magnitude-based step so tick labels stay round.
   */
  const axisDomain = React.useMemo(() => {
    if (ratedPoints.length === 0) return null;

    const niceExtent = (values: number[]): [number, number] => {
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      if (range === 0) return [min, max];
      const step = Math.pow(10, Math.floor(Math.log10(range / 4)));
      return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
    };

    return {
      x: niceExtent(ratedPoints.map((point) => point.rating)),
      y: niceExtent(ratedPoints.map((point) => point.score)),
    };
  }, [ratedPoints]);

  const trendSegment = React.useMemo(() => {
    if (visiblePoints.length < TRENDLINE_MIN_POINTS || axisDomain === null) {
      return null;
    }

    const fit = linearRegression(
      visiblePoints.map((point) => ({ x: point.rating, y: point.score }))
    );
    if (fit === null) return null;

    const ratings = visiblePoints.map((point) => point.rating);
    const scores = visiblePoints.map((point) => point.score);

    return clipTrendSegment(
      fit,
      Math.min(...ratings),
      Math.max(...ratings),
      Math.min(...scores),
      Math.max(...scores)
    );
  }, [visiblePoints, axisDomain]);

  const meta =
    sample.points.length < sample.totalScoreCount
      ? `${sample.points.length} of ${formatChartNumber(sample.totalScoreCount)} scores`
      : `${formatChartNumber(sample.points.length)} scores`;

  return (
    <SectionCard data-testid="beatmap-score-scatter" className={cn(className)}>
      <SectionHeader icon={ChartScatter} title="Score scatter" meta={meta} />
      {sample.points.length === 0 ? (
        <EmptyState>No verified scores yet.</EmptyState>
      ) : ratedPoints.length === 0 || axisDomain === null ? (
        <div className="flex h-[300px] items-center justify-center px-4">
          <EmptyState>
            No pre-match ratings available for these scores yet.
          </EmptyState>
        </div>
      ) : (
        <div className="space-y-2 px-4 py-4">
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
                  domain={axisDomain.x}
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
                  dataKey="score"
                  name="Score"
                  type="number"
                  domain={axisDomain.y}
                  tickFormatter={(value: number) => formatKilo(value)}
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
                            <span
                              className="size-2 rounded-[2px]"
                              style={{ backgroundColor: point.fill }}
                              aria-hidden="true"
                            />
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

                        return (
                          <>
                            <TooltipRow
                              label={String(name)}
                              value={formatChartNumber(
                                isRating ? Math.round(numeric) : numeric
                              )}
                            />
                            {isLastRow && point ? (
                              <TooltipRow label="Mods" value={point.modLabel} />
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
                  fillOpacity={isNarrow ? 0.45 : 0.65}
                  isAnimationActive={false}
                  shape={
                    <Symbols type="circle" size={dotArea} sizeType="area" />
                  }
                >
                  {visiblePoints.map((point, index) => (
                    <Cell key={index} fill={point.fill} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ChartContainer>
          )}
          <p className="text-xs text-muted-foreground">
            Pre-match ratings · recent scores may not have ratings yet
            {unratedCount > 0
              ? ` · ${formatChartNumber(unratedCount)} scores without ratings hidden`
              : ''}
          </p>
        </div>
      )}
    </SectionCard>
  );
}

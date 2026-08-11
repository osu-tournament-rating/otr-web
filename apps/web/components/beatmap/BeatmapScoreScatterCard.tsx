'use client';

import { ChartScatter } from 'lucide-react';
import dynamic from 'next/dynamic';
import * as React from 'react';
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import {
  EmptyState,
  Eyebrow,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import type { Scatter3DPoint } from '@/components/beatmap/BeatmapScoreScatter3D';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  RANK_RANGE_BUCKETS,
  type RankRangeBucketKey,
} from '@/lib/beatmaps/rankRange';
import type { BeatmapScoreSample } from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import {
  formatChartNumber,
  formatKilo,
  formatPercentage,
} from '@/lib/utils/chart';
import { getBeatmapModLabel, getModColor } from '@/lib/utils/mods';
import type { Mods } from '@otr/core/osu';

const BeatmapScoreScatter3D = dynamic(
  () => import('@/components/beatmap/BeatmapScoreScatter3D'),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[340px] w-full" />,
  }
);

interface BeatmapScoreScatterCardProps {
  sample: BeatmapScoreSample;
  className?: string;
}

type ScatterView = 'rating' | 'accuracy';
type ScatterMode = '2d' | '3d';
type ScatterColorBy = 'ranks' | 'mods';
type AccuracyXMode = 'score' | 'rating';
type AccuracyZoom = 'all' | '95-98' | '98-100';

type AxisKey = 'rating' | 'score' | 'accuracy';

interface ScatterPoint {
  score: number;
  /** Display accuracy in percent (0–100). */
  accuracy: number;
  rating: number | null;
  mods: number;
  modLabel: string;
  rankRange: RankRangeBucketKey;
  rankRangeLabel: string;
  /** Fill when coloring by mod combination. */
  modFill: string;
  /** Fill when coloring by tournament rank range. */
  rankFill: string;
}

/** Minimum rated points before a trendline is meaningful. */
const TRENDLINE_MIN_POINTS = 10;

/** Share of the sample kept in the accuracy view (top scores only). */
const ACCURACY_TOP_SHARE = 0.2;

const RANK_RANGE_COLOR = Object.fromEntries(
  RANK_RANGE_BUCKETS.map((bucket) => [bucket.key, bucket.color])
) as Record<RankRangeBucketKey, string>;

const RANK_RANGE_LABEL = Object.fromEntries(
  RANK_RANGE_BUCKETS.map((bucket) => [bucket.key, bucket.label])
) as Record<RankRangeBucketKey, string>;

const AXIS_NAME: Record<AxisKey, string> = {
  rating: 'Pre-match rating',
  score: 'Score',
  accuracy: 'Accuracy',
};

const ACCURACY_ZOOM_DOMAIN: Record<
  Exclude<AccuracyZoom, 'all'>,
  [number, number]
> = {
  '95-98': [95, 98],
  '98-100': [98, 100],
};

function formatAxisValue(key: AxisKey, value: number): string {
  switch (key) {
    case 'rating':
      return formatChartNumber(Math.round(value));
    case 'accuracy':
      return formatPercentage(value, 2);
    case 'score':
    default:
      return formatChartNumber(value);
  }
}

function tickFormatterFor(key: AxisKey): (value: number) => string {
  switch (key) {
    case 'rating':
      return (value) => formatChartNumber(Math.round(value));
    case 'accuracy':
      return (value) => `${Math.round(value)}%`;
    case 'score':
    default:
      return (value) => formatKilo(value);
  }
}

/**
 * Inclusive score threshold that keeps roughly the top `1 - percentile` share
 * of the sample. Returns null when there is nothing to threshold.
 */
function scoreAtPercentile(
  points: ScatterPoint[],
  percentile: number
): number | null {
  if (points.length === 0) return null;

  const sorted = points.map((point) => point.score).sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(percentile * sorted.length) - 1)
  );

  return sorted[index];
}

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
      <span className="font-mono font-medium text-foreground tabular-nums">
        {value}
      </span>
    </div>
  );
}

function ScatterPane({
  points,
  xKey,
  xDomain,
  yKey,
  yDomain,
  colorBy,
  trendSegment,
  yTickFormatter,
}: {
  points: ScatterPoint[];
  xKey: AxisKey;
  xDomain: React.ComponentProps<typeof XAxis>['domain'];
  yKey: AxisKey;
  yDomain: React.ComponentProps<typeof YAxis>['domain'];
  colorBy: ScatterColorBy;
  trendSegment: [{ x: number; y: number }, { x: number; y: number }] | null;
  /** Overrides the axis default, e.g. on a zoomed accuracy window. */
  yTickFormatter?: (value: number) => string;
}) {
  const fillOf = (point: ScatterPoint) =>
    colorBy === 'ranks' ? point.rankFill : point.modFill;

  return (
    <ChartContainer config={{}} className="aspect-auto h-[300px] w-full">
      <ScatterChart margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey}
          name={AXIS_NAME[xKey]}
          type="number"
          domain={xDomain}
          tickFormatter={tickFormatterFor(xKey)}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          dataKey={yKey}
          name={AXIS_NAME[yKey]}
          type="number"
          domain={yDomain}
          tickFormatter={yTickFormatter ?? tickFormatterFor(yKey)}
          tickLine={false}
          axisLine={false}
          width={yTickFormatter ? 52 : 44}
        />
        <ZAxis range={[30, 30]} />
        <ChartTooltip
          cursor={{ strokeDasharray: '3 3' }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const point = payload?.[0]?.payload as ScatterPoint | undefined;
                if (!point) return null;
                return (
                  <span className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: fillOf(point) }}
                      aria-hidden="true"
                    />
                    <span>
                      {colorBy === 'ranks'
                        ? point.rankRangeLabel
                        : point.modLabel}
                    </span>
                  </span>
                );
              }}
              formatter={(value, name, item, index, entries) => {
                const numeric =
                  typeof value === 'number' ? value : Number(value);
                const axisKey: AxisKey =
                  name === AXIS_NAME.accuracy
                    ? 'accuracy'
                    : name === AXIS_NAME.rating
                      ? 'rating'
                      : 'score';
                const point = (item as { payload?: ScatterPoint } | undefined)
                  ?.payload;
                const isLastRow =
                  index === (Array.isArray(entries) ? entries.length : 1) - 1;

                return (
                  <>
                    <TooltipRow
                      label={String(name)}
                      value={formatAxisValue(axisKey, numeric)}
                    />
                    {isLastRow && point ? (
                      colorBy === 'ranks' ? (
                        <TooltipRow label="Mods" value={point.modLabel} />
                      ) : (
                        <TooltipRow
                          label="Rank range"
                          value={point.rankRangeLabel}
                        />
                      )
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
        <Scatter data={points} fillOpacity={0.65} isAnimationActive={false}>
          {points.map((point, index) => (
            <Cell key={index} fill={fillOf(point)} />
          ))}
        </Scatter>
      </ScatterChart>
    </ChartContainer>
  );
}

function RankRangeLegend({ points }: { points: ScatterPoint[] }) {
  const entries = React.useMemo(() => {
    const counts = new Map<RankRangeBucketKey, number>();
    for (const point of points) {
      counts.set(point.rankRange, (counts.get(point.rankRange) ?? 0) + 1);
    }
    return RANK_RANGE_BUCKETS.filter((bucket) => counts.has(bucket.key)).map(
      (bucket) => ({
        key: bucket.key,
        label: bucket.label,
        count: counts.get(bucket.key) ?? 0,
      })
    );
  }, [points]);

  if (entries.length === 0) return null;

  return (
    <ul
      aria-label="Rank ranges"
      className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs"
    >
      {entries.map((entry) => (
        <li key={entry.key} className="flex items-center gap-1.5">
          <span
            className="size-2 rounded-[2px]"
            style={{ backgroundColor: RANK_RANGE_COLOR[entry.key] }}
            aria-hidden="true"
          />
          <span className="font-medium">{entry.label}</span>
          <span className="font-mono text-muted-foreground tabular-nums">
            {formatChartNumber(entry.count)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function toScatter3DPoints(
  points: ScatterPoint[],
  xKey: AxisKey,
  yKey: AxisKey
): Scatter3DPoint[] {
  const valueOf = (point: ScatterPoint, key: AxisKey) =>
    key === 'rating' ? (point.rating ?? 0) : point[key];

  return points.map((point) => ({
    x: valueOf(point, xKey),
    y: valueOf(point, yKey),
    rankRange: point.rankRange,
    mods: point.mods,
  }));
}

export default function BeatmapScoreScatterCard({
  sample,
  className,
}: BeatmapScoreScatterCardProps) {
  const [view, setView] = React.useState<ScatterView>('rating');
  const [mode, setMode] = React.useState<ScatterMode>('2d');
  const [colorBy, setColorBy] = React.useState<ScatterColorBy>('ranks');
  const [accuracyXMode, setAccuracyXMode] =
    React.useState<AccuracyXMode>('score');
  const [accuracyZoom, setAccuracyZoom] = React.useState<AccuracyZoom>('all');

  const points = React.useMemo<ScatterPoint[]>(
    () =>
      sample.points.map((point) => ({
        score: point.score,
        // gameScores.accuracy is stored as a 0–1 fraction (see
        // BeatmapScoreSamplePointSchema); convert to percent for display.
        accuracy: Math.min(100, Math.max(0, point.accuracy * 100)),
        rating: point.rating,
        mods: point.mods,
        modLabel: getBeatmapModLabel(point.mods),
        rankRange: point.rankRange,
        rankRangeLabel: RANK_RANGE_LABEL[point.rankRange],
        modFill: getModColor(point.mods as Mods),
        rankFill: RANK_RANGE_COLOR[point.rankRange],
      })),
    [sample.points]
  );

  const ratedPoints = React.useMemo(
    () => points.filter((point) => point.rating != null),
    [points]
  );
  const unratedCount = points.length - ratedPoints.length;

  const trendSegment = React.useMemo(() => {
    if (ratedPoints.length < TRENDLINE_MIN_POINTS) return null;

    const fit = linearRegression(
      ratedPoints.map((point) => ({
        x: point.rating as number,
        y: point.score,
      }))
    );
    if (fit === null) return null;

    const ratings = ratedPoints.map((point) => point.rating as number);
    const scores = ratedPoints.map((point) => point.score);

    return clipTrendSegment(
      fit,
      Math.min(...ratings),
      Math.max(...ratings),
      Math.min(...scores),
      Math.max(...scores)
    );
  }, [ratedPoints]);

  /** Top 20% of the sample by score — the band where accuracy actually varies. */
  const topAccuracyPoints = React.useMemo(() => {
    const threshold = scoreAtPercentile(points, 1 - ACCURACY_TOP_SHARE);
    if (threshold === null) return [];
    return points.filter((point) => point.score >= threshold);
  }, [points]);

  const accuracyPoints = React.useMemo(() => {
    const base =
      accuracyXMode === 'rating'
        ? topAccuracyPoints.filter((point) => point.rating != null)
        : topAccuracyPoints;

    if (accuracyZoom === 'all') return base;

    const [lower, upper] = ACCURACY_ZOOM_DOMAIN[accuracyZoom];
    return base.filter(
      (point) => point.accuracy >= lower && point.accuracy <= upper
    );
  }, [topAccuracyPoints, accuracyXMode, accuracyZoom]);

  const accuracyDomain = React.useMemo<
    React.ComponentProps<typeof YAxis>['domain']
  >(() => {
    if (accuracyZoom === 'all') {
      return [
        (dataMin: number) =>
          Math.max(0, Math.floor(Number.isFinite(dataMin) ? dataMin : 0)),
        100,
      ];
    }
    return ACCURACY_ZOOM_DOMAIN[accuracyZoom];
  }, [accuracyZoom]);

  /**
   * A zoomed window spans two or three points, so whole-percent ticks collapse
   * into repeated labels ("99%, 99%, 100%, 100%").
   */
  const accuracyTickFormatter = React.useMemo(
    () =>
      accuracyZoom === 'all'
        ? undefined
        : (value: number) => formatPercentage(value, 1),
    [accuracyZoom]
  );

  const accuracyXKey: AxisKey = accuracyXMode === 'rating' ? 'rating' : 'score';
  const accuracyUnratedHidden =
    accuracyXMode === 'rating'
      ? topAccuracyPoints.length -
        topAccuracyPoints.filter((point) => point.rating != null).length
      : 0;

  const meta =
    sample.points.length < sample.totalScoreCount
      ? `${sample.points.length} of ${formatChartNumber(sample.totalScoreCount)} scores`
      : `${formatChartNumber(sample.points.length)} scores`;

  return (
    <SectionCard data-testid="beatmap-score-scatter" className={cn(className)}>
      <SectionHeader icon={ChartScatter} title="Score scatter" meta={meta} />
      {points.length === 0 ? (
        <EmptyState>No verified scores yet.</EmptyState>
      ) : (
        <Tabs
          value={view}
          onValueChange={(next) => setView(next as ScatterView)}
          className="gap-3 px-4 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList aria-label="Scatter view">
              <TabsTrigger value="rating">Rating</TabsTrigger>
              <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
            </TabsList>
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                type="single"
                size="sm"
                variant="outline"
                aria-label="Chart dimensions"
                value={mode}
                onValueChange={(next) => {
                  if (next) setMode(next as ScatterMode);
                }}
              >
                <ToggleGroupItem value="2d">2D</ToggleGroupItem>
                <ToggleGroupItem value="3d">3D</ToggleGroupItem>
              </ToggleGroup>
              {mode === '2d' ? (
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  aria-label="Color points by"
                  value={colorBy}
                  onValueChange={(next) => {
                    if (next) setColorBy(next as ScatterColorBy);
                  }}
                >
                  <ToggleGroupItem value="ranks">Ranks</ToggleGroupItem>
                  <ToggleGroupItem value="mods">Mods</ToggleGroupItem>
                </ToggleGroup>
              ) : null}
            </div>
          </div>

          <TabsContent value="rating" className="space-y-2">
            {ratedPoints.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <EmptyState>
                  No pre-match ratings available for these scores yet.
                </EmptyState>
              </div>
            ) : mode === '3d' ? (
              <BeatmapScoreScatter3D
                className="h-[340px]"
                points={toScatter3DPoints(ratedPoints, 'rating', 'score')}
                xLabel={AXIS_NAME.rating}
                xFormat="rating"
                yLabel={AXIS_NAME.score}
                yFormat="kilo"
              />
            ) : (
              <>
                <ScatterPane
                  points={ratedPoints}
                  xKey="rating"
                  xDomain={['auto', 'auto']}
                  yKey="score"
                  yDomain={['auto', 'auto']}
                  colorBy={colorBy}
                  trendSegment={trendSegment}
                />
                {colorBy === 'ranks' ? (
                  <RankRangeLegend points={ratedPoints} />
                ) : null}
              </>
            )}
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              Pre-match ratings · recent scores may not have ratings yet
              {unratedCount > 0
                ? ` · ${formatChartNumber(unratedCount)} scores without ratings hidden`
                : ''}
            </p>
          </TabsContent>

          <TabsContent value="accuracy" className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-2">
                <Eyebrow>X axis</Eyebrow>
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  aria-label="Accuracy x axis"
                  value={accuracyXMode}
                  onValueChange={(next) => {
                    if (next) setAccuracyXMode(next as AccuracyXMode);
                  }}
                >
                  <ToggleGroupItem value="score">vs Score</ToggleGroupItem>
                  <ToggleGroupItem value="rating">vs Rating</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex items-center gap-2">
                <Eyebrow>Zoom</Eyebrow>
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  aria-label="Accuracy zoom"
                  value={accuracyZoom}
                  onValueChange={(next) => {
                    if (next) setAccuracyZoom(next as AccuracyZoom);
                  }}
                >
                  <ToggleGroupItem value="all">Full</ToggleGroupItem>
                  <ToggleGroupItem value="95-98">95–98</ToggleGroupItem>
                  <ToggleGroupItem value="98-100">98–100</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {accuracyPoints.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <EmptyState>No scores in this accuracy window.</EmptyState>
              </div>
            ) : mode === '3d' ? (
              <BeatmapScoreScatter3D
                className="h-[340px]"
                points={toScatter3DPoints(
                  accuracyPoints,
                  accuracyXKey,
                  'accuracy'
                )}
                xLabel={AXIS_NAME[accuracyXKey]}
                xFormat={accuracyXKey === 'rating' ? 'rating' : 'kilo'}
                yLabel={AXIS_NAME.accuracy}
                yFormat="percent"
              />
            ) : (
              <>
                <ScatterPane
                  points={accuracyPoints}
                  xKey={accuracyXKey}
                  xDomain={['auto', 'auto']}
                  yKey="accuracy"
                  yDomain={accuracyDomain}
                  colorBy={colorBy}
                  trendSegment={null}
                  yTickFormatter={accuracyTickFormatter}
                />
                {colorBy === 'ranks' ? (
                  <RankRangeLegend points={accuracyPoints} />
                ) : null}
              </>
            )}
            <p className="font-mono text-xs text-muted-foreground tabular-nums">
              Top 20% of sampled scores by score ·{' '}
              {formatChartNumber(accuracyPoints.length)} of{' '}
              {formatChartNumber(points.length)} shown
            </p>
            {accuracyXMode === 'rating' ? (
              <p className="font-mono text-xs text-muted-foreground tabular-nums">
                Pre-match ratings · recent scores may not have ratings yet
                {accuracyUnratedHidden > 0
                  ? ` · ${formatChartNumber(accuracyUnratedHidden)} scores without ratings hidden`
                  : ''}
              </p>
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </SectionCard>
  );
}

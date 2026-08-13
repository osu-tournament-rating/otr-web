'use client';

import { ListFilter } from 'lucide-react';
import * as React from 'react';
import { Label, Pie, PieChart, Sector } from 'recharts';
import type { PieSectorDataItem } from 'recharts/types/polar/Pie';

import {
  EmptyState,
  Eyebrow,
  SectionCard,
  SectionHeader,
  Swatch,
  Tile,
} from '@/components/beatmap/BeatmapSection';
import TapTooltip from '@/components/tap-tooltip';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import type { RankRangeBucketKey } from '@/lib/beatmaps/rankRange';
import { RANK_RANGE_BUCKETS, bucketRankRanges } from '@/lib/beatmaps/rankRange';
import type {
  BeatmapFreemodPickSummary,
  BeatmapGradeCount,
  BeatmapModDistribution,
  BeatmapRankRangeModDistribution,
  BeatmapTournamentUsage,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';
import {
  BEATMAP_MOD_OTHER_LABEL,
  calculateBeatmapModDistribution,
  collapseBeatmapModDistribution,
  getModColor,
} from '@/lib/utils/mods';
import { ScoreGrade } from '@otr/core/osu';

export interface ModSegment {
  label: string;
  scoreCount: number;
  percentage: number;
  percentageLabel: string;
  fill: string;
}

export interface RankRangeModSummary {
  /** Segments per bucket, keyed for lookup beside the rank-range pie. */
  byBucket: Map<
    RankRangeBucketKey,
    { scoreCount: number; segments: ModSegment[] }
  >;
  /**
   * One legend for all buckets: colors are globally consistent via
   * `getModColor`, so per-bucket legends would only multiply the noise.
   * Deduped by label, ordered by total score count desc.
   */
  legend: Array<{ label: string; fill: string; scoreCount: number }>;
}

/**
 * Every mod bar on the page runs through this pipeline so they read as the
 * same visual system.
 */
function toModSegments(
  distribution: BeatmapFreemodPickSummary['distribution']
): ModSegment[] {
  return collapseBeatmapModDistribution(
    calculateBeatmapModDistribution(distribution)
  ).map(({ label, mods, scoreCount, percentage }) => ({
    label,
    scoreCount,
    percentage,
    percentageLabel: formatPercentage(percentage, 1),
    fill:
      label === BEATMAP_MOD_OTHER_LABEL
        ? 'var(--muted-foreground)'
        : getModColor(mods),
  }));
}

/**
 * Folds the backend's per-bucket mod rows into display segments plus the single
 * shared legend. Exported for tests.
 */
export function summarizeRankRangeMods(
  rankRangeMods: ReadonlyArray<BeatmapRankRangeModDistribution>
): RankRangeModSummary {
  const byBucket: RankRangeModSummary['byBucket'] = new Map();
  const totalsByLabel = new Map<
    string,
    { label: string; fill: string; scoreCount: number }
  >();

  for (const bucket of rankRangeMods) {
    const segments = toModSegments(bucket.distribution);
    if (segments.length === 0) continue;

    byBucket.set(bucket.rankRange, {
      scoreCount: bucket.scoreCount,
      segments,
    });

    for (const segment of segments) {
      const existing = totalsByLabel.get(segment.label);

      totalsByLabel.set(segment.label, {
        label: segment.label,
        fill: existing?.fill ?? segment.fill,
        scoreCount: (existing?.scoreCount ?? 0) + segment.scoreCount,
      });
    }
  }

  const legend = Array.from(totalsByLabel.values()).sort(
    (left, right) =>
      right.scoreCount - left.scoreCount ||
      left.label.localeCompare(right.label)
  );

  return { byBucket, legend };
}

/**
 * Silver and normal grades are combined for display: SSH+SS read as SS and
 * SH+S read as S. Ordered best to worst.
 */
const GRADE_GROUPS = [
  {
    label: 'SS',
    grades: [ScoreGrade.SSH, ScoreGrade.SS],
    fill: 'var(--grade-ss)',
  },
  { label: 'S', grades: [ScoreGrade.SH, ScoreGrade.S], fill: 'var(--grade-s)' },
  { label: 'A', grades: [ScoreGrade.A], fill: 'var(--grade-a)' },
  { label: 'B', grades: [ScoreGrade.B], fill: 'var(--grade-b)' },
  { label: 'C', grades: [ScoreGrade.C], fill: 'var(--grade-c)' },
  { label: 'D', grades: [ScoreGrade.D], fill: 'var(--grade-d)' },
] as const;

function buildGradeSegments(gradeDistribution: BeatmapGradeCount[]) {
  const countsByGrade = new Map<ScoreGrade, number>();

  for (const { grade, scoreCount } of gradeDistribution) {
    countsByGrade.set(grade, (countsByGrade.get(grade) ?? 0) + scoreCount);
  }

  const grouped = GRADE_GROUPS.map((group) => ({
    label: group.label,
    fill: group.fill,
    scoreCount: group.grades.reduce(
      (total, grade) => total + (countsByGrade.get(grade) ?? 0),
      0
    ),
  })).filter((group) => group.scoreCount > 0);

  const totalGraded = grouped.reduce(
    (total, group) => total + group.scoreCount,
    0
  );

  return grouped.map((group) => {
    const percentage =
      totalGraded > 0 ? (group.scoreCount / totalGraded) * 100 : 0;

    return {
      ...group,
      percentage,
      percentageLabel: formatPercentage(percentage, 1),
    };
  });
}

interface DisplaySegment {
  label: string;
  scoreCount: number;
  percentage: number;
  percentageLabel: string;
  fill: string;
}

/**
 * The one value string every legend, row, and tooltip line prints. Keep the
 * shape (`29.3% · 241`) — the e2e legend assertions parse it.
 */
function formatSegmentValue(
  segment: Pick<DisplaySegment, 'percentageLabel' | 'scoreCount'>
): string {
  return `${segment.percentageLabel} · ${formatChartNumber(segment.scoreCount)}`;
}

/** The shared "single bar with colored sections" mark. */
function SegmentBar({
  segments,
  testId,
  className,
}: {
  segments: DisplaySegment[];
  testId: string;
  className?: string;
}) {
  return (
    /* The legend beside every bar carries the same values as text, so the
       bar itself is presentational only. */
    <div
      data-testid={testId}
      className={cn('flex h-7 w-full gap-[2px]', className)}
      aria-hidden="true"
    >
      {segments.map((segment) => (
        <div
          key={segment.label}
          // Flex growth keeps the 2px gaps from pushing the row past 100%.
          className="h-full min-w-[3px] first:rounded-l-md last:rounded-r-md"
          style={{
            flex: `${segment.percentage} 1 0`,
            backgroundColor: segment.fill,
          }}
        />
      ))}
    </div>
  );
}

function SegmentLegend({
  segments,
  ariaLabel,
  className,
}: {
  segments: DisplaySegment[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <ul
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-x-4 gap-y-1.5 text-xs', className)}
    >
      {segments.map((segment) => (
        <li key={segment.label} className="flex items-center gap-1.5">
          <Swatch color={segment.fill} />
          <span className="text-muted-foreground">{segment.label}</span>
          <span className="font-medium whitespace-nowrap text-foreground">
            {formatSegmentValue(segment)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Freemod picks as a ranking, not a composition: track widths scale to the top pick. */
function FreemodPickRows({ segments }: { segments: ModSegment[] }) {
  const maxPercentage = Math.max(...segments.map((s) => s.percentage));

  return (
    <ul aria-label="Freemod mod picks" className="space-y-1.5">
      {segments.map((segment) => (
        <li key={segment.label} className="flex min-h-5 items-center gap-2">
          <span className="flex w-16 shrink-0 items-center gap-1.5">
            <Swatch color={segment.fill} />
            <span className="truncate text-xs text-muted-foreground">
              {segment.label}
            </span>
          </span>
          <span
            className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
            aria-hidden="true"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${maxPercentage > 0 ? (segment.percentage / maxPercentage) * 100 : 0}%`,
                minWidth: segment.percentage > 0 ? 2 : 0,
                backgroundColor: segment.fill,
              }}
            />
          </span>
          <span className="w-24 shrink-0 text-right text-xs font-medium text-foreground">
            {formatSegmentValue(segment)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Below a handful of scores a percentage is noise (1 of 4 is not "25% of the
 * meta"), so the raw counts are shown instead. Every pick still appears.
 */
function FreemodPickChips({ segments }: { segments: ModSegment[] }) {
  return (
    <ul aria-label="Freemod mod picks" className="flex flex-wrap gap-1.5">
      {segments.map((segment) => (
        <li key={segment.label}>
          <Badge variant="outline" className="gap-1.5">
            <Swatch color={segment.fill} />
            {`${segment.label} ${formatChartNumber(segment.scoreCount)}`}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

interface RankRangeSlice {
  key: RankRangeBucketKey;
  label: string;
  count: number;
  fill: string;
}

/**
 * Long mod tails turn the tooltip into a wall of rows; the remainder collapses
 * into one summed line instead.
 */
const TOOLTIP_MOD_ROW_CAP = 5;

/**
 * Slices count pools; the mod rows count verified scores. The sub-caption names
 * that second population explicitly so the two are never read as one.
 */
function RankBucketTooltipBody({
  slice,
  bucketMods,
}: {
  slice: RankRangeSlice;
  bucketMods?: { scoreCount: number; segments: ModSegment[] };
}) {
  const shown = bucketMods?.segments.slice(0, TOOLTIP_MOD_ROW_CAP) ?? [];
  const rest = bucketMods?.segments.slice(TOOLTIP_MOD_ROW_CAP) ?? [];
  // With no mod rows beneath it the rule has nothing to divide, and the panel
  // would end on a floating line.
  const hasModRows = shown.length > 0;

  return (
    <div className="min-w-44 space-y-1 text-xs">
      <div className={cn('space-y-0.5', hasModRows && 'border-b pb-1.5')}>
        <div className="flex items-center gap-1.5 font-medium">
          <Swatch color={slice.fill} />
          {`${slice.label} · ${formatChartNumber(slice.count)} ${
            slice.count === 1 ? 'pool' : 'pools'
          }`}
        </div>
        <p className="text-muted-foreground">
          {bucketMods
            ? `Mods in ${formatChartNumber(bucketMods.scoreCount)} verified scores`
            : 'No verified scores in this bracket'}
        </p>
      </div>

      {shown.map((segment) => (
        <div
          key={segment.label}
          className="flex items-baseline justify-between gap-4"
        >
          <span className="flex items-baseline gap-1.5">
            <Swatch color={segment.fill} />
            <span className="font-medium">{segment.label}</span>
          </span>
          <span>{formatSegmentValue(segment)}</span>
        </div>
      ))}

      {rest.length > 0 ? (
        <div className="flex items-baseline justify-between gap-4 text-muted-foreground">
          <span>{`+${rest.length} more`}</span>
          <span>
            {formatPercentage(
              rest.reduce((total, segment) => total + segment.percentage, 0),
              1
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** Donut of tournament pools by rank range. Hover only grows the slice — the tooltip is the sole mod-disclosure channel. */
function RankRangePie({
  slices,
  totalPools,
  modsByBucket,
}: {
  slices: RankRangeSlice[];
  totalPools: number;
  modsByBucket: RankRangeModSummary['byBucket'];
}) {
  const renderCenterLabel = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => {
      const { viewBox } = props;
      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
        return (
          <text
            x={viewBox.cx}
            y={viewBox.cy}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            <tspan
              x={viewBox.cx}
              y={viewBox.cy}
              className="fill-foreground text-2xl font-bold"
            >
              {formatChartNumber(totalPools)}
            </tspan>
            <tspan
              x={viewBox.cx}
              y={(viewBox.cy || 0) + 20}
              className="fill-muted-foreground text-xs"
            >
              pools
            </tspan>
          </text>
        );
      }
      return null;
    },
    [totalPools]
  );

  const renderActiveSlice = React.useCallback((props: PieSectorDataItem) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius = 0,
      startAngle,
      endAngle,
      fill,
    } = props;

    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    );
  }, []);

  return (
    <ChartContainer
      config={{}}
      className="mx-auto aspect-square h-[200px] w-full max-w-[240px]"
    >
      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Pie
          data={slices}
          dataKey="count"
          nameKey="label"
          innerRadius="55%"
          outerRadius="78%"
          paddingAngle={3}
          activeShape={renderActiveSlice}
          isAnimationActive={false}
        >
          <Label content={renderCenterLabel} />
        </Pie>
        <ChartTooltip
          /* Parked, not cursor-tracking: a ~200px panel chasing the pointer
             around a 240px donut covers the center label from every angle. x is
             the viewBox left edge so the tooltip cannot widen the document at
             390px. */
          position={{ x: 4, y: 136 }}
          wrapperStyle={{ zIndex: 30 }}
          content={({ active, payload }) => {
            const slice = payload?.[0]?.payload as RankRangeSlice | undefined;
            if (!active || !slice) return null;

            return (
              <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
                <RankBucketTooltipBody
                  slice={slice}
                  bucketMods={modsByBucket.get(slice.key)}
                />
              </div>
            );
          }}
        />
      </PieChart>
    </ChartContainer>
  );
}

interface BeatmapDistributionsCardProps {
  modStats: BeatmapModDistribution[];
  pools: BeatmapTournamentUsage[];
  freemodPicks: BeatmapFreemodPickSummary;
  rankRangeMods: BeatmapRankRangeModDistribution[];
  gradeDistribution: BeatmapGradeCount[];
  className?: string;
}

export default function BeatmapDistributionsCard({
  modStats,
  pools,
  freemodPicks,
  rankRangeMods,
  gradeDistribution,
  className,
}: BeatmapDistributionsCardProps) {
  const modSegments = React.useMemo(() => toModSegments(modStats), [modStats]);

  const totalScoreCount = React.useMemo(
    () => modSegments.reduce((total, segment) => total + segment.scoreCount, 0),
    [modSegments]
  );

  const gradeSegments = React.useMemo(
    () => buildGradeSegments(gradeDistribution),
    [gradeDistribution]
  );

  const freemodSegments = React.useMemo(
    () => toModSegments(freemodPicks.distribution),
    [freemodPicks.distribution]
  );

  const { byBucket: modsByBucket } = React.useMemo(
    () => summarizeRankRangeMods(rankRangeMods),
    [rankRangeMods]
  );

  const rankSlices = React.useMemo<RankRangeSlice[]>(() => {
    const colorByKey = new Map(
      RANK_RANGE_BUCKETS.map((bucket) => [bucket.key, bucket.color])
    );

    return bucketRankRanges(pools)
      .filter((bucket) => bucket.count > 0)
      .map((bucket) => ({
        ...bucket,
        fill: colorByKey.get(bucket.key)!,
      }));
  }, [pools]);

  return (
    <SectionCard
      data-testid="beatmap-mod-distribution-chart"
      /* The rank-range tooltip is taller than the space left under the donut on
         sparse pages, so it has to be allowed past the card edge. Nothing in
         this card paints to its corners, so dropping the clip is invisible. */
      className={cn('flex flex-col overflow-visible', className)}
    >
      <SectionHeader icon={ListFilter} title="Distributions" />

      {modSegments.length === 0 ? (
        <EmptyState>No mod data available.</EmptyState>
      ) : (
        /* Fills the card so a taller neighbour column stretches the section
           rules instead of leaving them hanging mid-card. */
        <div className="flex flex-1 flex-col divide-y">
          <div className="space-y-3 px-4 py-4">
            <div className="flex items-baseline justify-between gap-2">
              <Eyebrow>Mod distribution</Eyebrow>
              <span className="text-xs text-muted-foreground">
                {`${formatChartNumber(totalScoreCount)} scores`}
              </span>
            </div>
            <SegmentBar
              segments={modSegments}
              testId="beatmap-mod-distribution-bar"
            />
            <SegmentLegend
              segments={modSegments}
              ariaLabel="Mod distribution"
            />
          </div>

          <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_18rem] lg:divide-x">
            {/* Each section takes an equal share of the column so the rule
                between them lands mid-column and neither section's content is
                stranded above a tall empty region. */}
            <div className="flex flex-col divide-y">
              <div className="flex-1 px-4 py-4">
                <div className="flex h-full flex-col justify-center space-y-3">
                  {/* Wrapped so the label's box hugs the text like the mod
                      distribution header does; a bare inline Eyebrow inherits
                      the parent's taller strut and eats into the gap below
                      it. */}
                  <div className="flex items-baseline">
                    <Eyebrow>Grades</Eyebrow>
                  </div>
                  {gradeSegments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No grade data recorded for these scores.
                    </p>
                  ) : (
                    <>
                      <SegmentBar
                        segments={gradeSegments}
                        testId="beatmap-grade-distribution-bar"
                      />
                      <SegmentLegend
                        segments={gradeSegments}
                        ariaLabel="Grade distribution"
                        /* auto-fit, not a fixed 3, because a fixed track is
                           ~98px at 1024px and the widest cell needs ~110px,
                           which split "33.3% · 455" across two lines. */
                        className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 px-4 py-4">
                <div className="flex h-full flex-col justify-center space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <Eyebrow>Freemod picks</Eyebrow>
                    {freemodPicks.freemodGameCount > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {`${formatChartNumber(freemodPicks.freemodScoreCount)} scores · ${formatChartNumber(freemodPicks.freemodGameCount)} games`}
                      </span>
                    ) : null}
                  </div>

                  {freemodPicks.freemodGameCount === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No freemod games recorded.
                    </p>
                  ) : freemodSegments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No verified scores in freemod games yet.
                    </p>
                  ) : freemodPicks.freemodScoreCount < 5 ? (
                    <FreemodPickChips segments={freemodSegments} />
                  ) : (
                    <FreemodPickRows segments={freemodSegments} />
                  )}
                </div>
              </div>
            </div>

            <div
              className="flex flex-col border-t px-4 py-4 lg:border-t-0"
              data-testid="beatmap-rank-range"
            >
              {/* The row ends on one line, so this column stretches to whatever
                  height the Overview rail sets. Its label and donut center
                  together rather than the label pinning to the top and leaving
                  the donut adrift a couple of hundred pixels below it. */}
              <div className="flex h-full flex-col justify-center space-y-3">
                <div className="space-y-0.5">
                  <Eyebrow>Tournament rank ranges</Eyebrow>
                </div>

                {rankSlices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Never pooled by a tournament.
                  </p>
                ) : rankSlices.length === 1 ? (
                  /* One bracket is not a distribution — a donut of a single
                     slice would encode nothing the sentence does not. */
                  <Tile
                    data-testid="beatmap-rank-range-summary"
                    className="py-6"
                  >
                    <p className="flex items-center justify-center gap-1.5 text-center text-sm font-medium">
                      <Swatch color={rankSlices[0].fill} />
                      {rankSlices[0].count === 1
                        ? `1 pool · ${rankSlices[0].label} rank`
                        : `All ${formatChartNumber(rankSlices[0].count)} pools · ${
                            rankSlices[0].label
                          } rank`}
                    </p>
                  </Tile>
                ) : (
                  <>
                    <RankRangePie
                      slices={rankSlices}
                      totalPools={pools.length}
                      modsByBucket={modsByBucket}
                    />
                    {/* Sliver brackets are unhittable on the ring, so every
                        bracket is also inspectable from its legend row. */}
                    <ul
                      aria-label="Tournaments by rank range"
                      className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs"
                    >
                      {rankSlices.map((slice) => (
                        <li key={slice.key}>
                          <TapTooltip
                            side="top"
                            content={
                              <RankBucketTooltipBody
                                slice={slice}
                                bucketMods={modsByBucket.get(slice.key)}
                              />
                            }
                            triggerClassName="flex w-auto items-center gap-1.5 rounded-sm px-1 py-0.5 transition-colors hover:bg-accent"
                          >
                            <Swatch color={slice.fill} />
                            <span className="text-muted-foreground">
                              {slice.label}
                            </span>
                            <span className="font-medium text-foreground">
                              {formatChartNumber(slice.count)}
                            </span>
                          </TapTooltip>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

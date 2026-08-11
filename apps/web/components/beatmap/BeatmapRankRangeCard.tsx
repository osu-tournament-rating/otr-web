'use client';

import { Layers } from 'lucide-react';
import * as React from 'react';

import {
  EmptyState,
  Eyebrow,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import SimpleTooltip from '@/components/simple-tooltip';
import type { RankRangeBucketKey } from '@/lib/beatmaps/rankRange';
import { bucketRankRanges } from '@/lib/beatmaps/rankRange';
import type {
  BeatmapFreemodPickSummary,
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

export interface ModSegment {
  label: string;
  scoreCount: number;
  percentage: number;
  percentageLabel: string;
  fill: string;
}

export interface RankRangeModSummary {
  /** Segments per bucket, keyed for lookup beside the histogram row. */
  byBucket: Map<
    RankRangeBucketKey,
    { scoreCount: number; segments: ModSegment[] }
  >;
  /**
   * One legend for all five bars: colors are globally consistent via
   * `getModColor`, so per-bucket legends would only multiply the noise.
   * Deduped by label, ordered by total score count desc.
   */
  legend: Array<{ label: string; fill: string; scoreCount: number }>;
}

/**
 * Mirrors BeatmapModDistributionChart's segment pipeline so every mod bar on
 * the page reads as the same visual system.
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

interface BeatmapRankRangeCardProps {
  pools: BeatmapTournamentUsage[];
  freemodPicks: BeatmapFreemodPickSummary;
  rankRangeMods: BeatmapRankRangeModDistribution[];
  className?: string;
}

export default function BeatmapRankRangeCard({
  pools,
  freemodPicks,
  rankRangeMods,
  className,
}: BeatmapRankRangeCardProps) {
  const rankBuckets = React.useMemo(() => bucketRankRanges(pools), [pools]);
  const maxBucketCount = React.useMemo(
    () => Math.max(...rankBuckets.map((bucket) => bucket.count)),
    [rankBuckets]
  );

  const { byBucket: modsByBucket, legend: modLegend } = React.useMemo(
    () => summarizeRankRangeMods(rankRangeMods),
    [rankRangeMods]
  );

  const freemodSegments = React.useMemo(
    () => toModSegments(freemodPicks.distribution),
    [freemodPicks.distribution]
  );

  return (
    <SectionCard data-testid="beatmap-rank-range" className={cn(className)}>
      <SectionHeader
        icon={Layers}
        title="Rank range"
        meta={`${formatChartNumber(pools.length)} pools`}
      />

      {pools.length === 0 ? (
        <EmptyState>Never pooled by a tournament.</EmptyState>
      ) : (
        <div className="divide-y">
          <div className="space-y-3 px-4 py-4">
            <Eyebrow>Rank ranges</Eyebrow>
            <ul
              aria-label="Tournaments by rank range"
              className="space-y-3"
              data-testid="beatmap-rank-range-histogram"
            >
              {rankBuckets.map((bucket) => {
                const bucketMods = modsByBucket.get(bucket.key);

                return (
                  <li key={bucket.key} className="space-y-[3px]">
                    <div className="flex items-center gap-2">
                      <Eyebrow className="w-10 shrink-0">
                        {bucket.label}
                      </Eyebrow>
                      <div
                        aria-hidden="true"
                        className="h-4 min-w-0 flex-1 rounded bg-muted"
                      >
                        <div
                          className="h-full rounded bg-primary"
                          style={{
                            width:
                              maxBucketCount > 0
                                ? `${(bucket.count / maxBucketCount) * 100}%`
                                : '0%',
                            minWidth: bucket.count > 0 ? 2 : 0,
                          }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums">
                        {formatChartNumber(bucket.count)}
                      </span>
                    </div>

                    {/* Buckets with pools but no verified scores simply show no
                        mod bar; the histogram row already reports the pools. */}
                    {bucketMods ? (
                      <SimpleTooltip
                        content={
                          <div className="min-w-44 space-y-1">
                            <div className="border-b pb-1.5 text-xs font-medium">
                              {`${bucket.label} · ${formatChartNumber(
                                bucketMods.scoreCount
                              )} scores`}
                            </div>

                            {bucketMods.segments.map((segment) => (
                              <div
                                key={segment.label}
                                className="flex items-baseline justify-between gap-4"
                              >
                                <span className="flex items-baseline gap-1.5">
                                  <span
                                    className="size-2 shrink-0 rounded-[2px]"
                                    style={{ backgroundColor: segment.fill }}
                                    aria-hidden="true"
                                  />
                                  <span className="text-xs font-medium">
                                    {segment.label}
                                  </span>
                                </span>
                                <span className="font-mono text-xs tabular-nums">
                                  {`${segment.percentageLabel} · ${formatChartNumber(
                                    segment.scoreCount
                                  )}`}
                                </span>
                              </div>
                            ))}
                          </div>
                        }
                      >
                        {/* Indented to line up with the histogram track above.
                            The shared legend and this tooltip carry the same
                            values as text, so the bar is presentational. */}
                        <div
                          data-testid={`beatmap-rank-range-mod-bar-${bucket.key}`}
                          className="mr-10 ml-12 flex h-1.5 w-auto gap-[2px]"
                          aria-hidden="true"
                        >
                          {bucketMods.segments.map((segment) => (
                            <div
                              key={segment.label}
                              // Flex growth keeps the 2px gaps from pushing the
                              // row past 100%.
                              className="h-full min-w-[3px] first:rounded-l-full last:rounded-r-full"
                              style={{
                                flex: `${segment.percentage} 1 0`,
                                backgroundColor: segment.fill,
                              }}
                            />
                          ))}
                        </div>
                      </SimpleTooltip>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            {modLegend.length > 0 ? (
              <ul
                aria-label="Mods by rank range"
                className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs"
              >
                {modLegend.map((entry) => (
                  <li key={entry.label} className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-[2px]"
                      style={{ backgroundColor: entry.fill }}
                      aria-hidden="true"
                    />
                    <span className="font-medium">{entry.label}</span>
                    <span className="font-mono text-muted-foreground tabular-nums">
                      {formatChartNumber(entry.scoreCount)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="space-y-3 px-4 py-4">
            <div className="space-y-0.5">
              <Eyebrow>Freemod picks</Eyebrow>
              {freemodPicks.freemodGameCount > 0 ? (
                <p className="font-mono text-xs text-muted-foreground tabular-nums">
                  {formatChartNumber(freemodPicks.freemodScoreCount)} scores in{' '}
                  {formatChartNumber(freemodPicks.freemodGameCount)} freemod
                  games
                </p>
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
            ) : (
              <>
                {/* The legend below carries the same values as text, so the
                    bar is presentational only. Markup intentionally mirrors
                    BeatmapModDistributionChart's segment bar. */}
                <div
                  data-testid="beatmap-freemod-picks-bar"
                  className="flex h-7 w-full gap-[2px]"
                  aria-hidden="true"
                >
                  {freemodSegments.map((segment) => (
                    <div
                      key={segment.label}
                      // Flex growth keeps the 2px gaps from pushing the row
                      // past 100%.
                      className="h-full min-w-[3px] first:rounded-l-md last:rounded-r-md"
                      style={{
                        flex: `${segment.percentage} 1 0`,
                        backgroundColor: segment.fill,
                      }}
                    />
                  ))}
                </div>

                <ul
                  aria-label="Freemod mod picks"
                  className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs"
                >
                  {freemodSegments.map((segment) => (
                    <li
                      key={segment.label}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className="size-2 rounded-[2px]"
                        style={{ backgroundColor: segment.fill }}
                        aria-hidden="true"
                      />
                      <span className="font-medium">{segment.label}</span>
                      <span className="font-mono text-muted-foreground tabular-nums">
                        {segment.percentageLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

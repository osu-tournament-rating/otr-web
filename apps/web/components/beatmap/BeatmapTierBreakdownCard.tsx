'use client';

import { Medal } from 'lucide-react';
import * as React from 'react';

import {
  EmptyState,
  Eyebrow,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import TierIcon from '@/components/icons/TierIcon';
import SimpleTooltip from '@/components/simple-tooltip';
import type {
  BeatmapTierBreakdown,
  BeatmapTierScoreSummary,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import {
  formatChartNumber,
  formatKilo,
  formatPercentage,
} from '@/lib/utils/chart';
import { getTierColor, tierData, type TierName } from '@/lib/utils/tierData';

interface BeatmapTierBreakdownCardProps {
  tierBreakdown: BeatmapTierBreakdown;
  className?: string;
}

/**
 * Theme-aware tier accents, mirroring the `--text-<tier>` custom properties
 * that back `tierColors[...].textClass`.
 */
const TIER_CHART_COLOR: Record<TierName, string> = {
  Bronze: 'var(--text-bronze)',
  Silver: 'var(--text-silver)',
  Gold: 'var(--text-gold)',
  Platinum: 'var(--text-platinum)',
  Emerald: 'var(--text-emerald)',
  Diamond: 'var(--text-diamond)',
  Master: 'var(--text-master)',
  Grandmaster: 'var(--text-grandmaster)',
  'Elite Grandmaster': 'var(--text-elite-grandmaster)',
};

const TIER_DISPLAY_NAME: Record<TierName, string> = tierData.reduce(
  (names, entry) => {
    names[entry.tier] = entry.displayName;
    return names;
  },
  {} as Record<TierName, string>
);

/** Positions a value on the shared 0..max score scale as a CSS percentage. */
function toScalePercent(value: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  return Math.min(100, Math.max(0, (value / maxScore) * 100));
}

/** Positions a percentage on the zoomed accuracy domain as a CSS percentage. */
function toAccuracyPercent(
  accuracyPercent: number,
  lowerBound: number
): number {
  const span = 100 - lowerBound;
  if (span <= 0) return 100;
  return Math.min(
    100,
    Math.max(0, ((accuracyPercent - lowerBound) / span) * 100)
  );
}

function TierLabel({ tier }: { tier: TierName }) {
  return (
    <span className="flex w-28 shrink-0 items-center gap-1.5">
      <TierIcon
        tier={tier}
        subTier={1}
        tooltip={false}
        width={18}
        height={18}
      />
      <span
        className={cn(
          'truncate text-xs font-medium',
          getTierColor(tier)?.textClass
        )}
      >
        {TIER_DISPLAY_NAME[tier]}
      </span>
    </span>
  );
}

/** Hollow ring glyph echoing the box plot's min/max marks. */
function RingGlyph({ color }: { color: string }) {
  return (
    <span
      className="inline-block size-1.5 shrink-0 rounded-full border bg-transparent"
      style={{ borderColor: color }}
      aria-hidden="true"
    />
  );
}

function TierTooltipContent({ summary }: { summary: BeatmapTierScoreSummary }) {
  const color = TIER_CHART_COLOR[summary.tier];

  return (
    <div className="min-w-44 space-y-1">
      <div className="flex items-center justify-between gap-4 border-b pb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <TierIcon
            tier={summary.tier}
            subTier={1}
            tooltip={false}
            width={14}
            height={14}
          />
          {TIER_DISPLAY_NAME[summary.tier]}
        </span>
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {`${formatChartNumber(summary.scoreCount)} scores`}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">Median</span>
        <span className="font-mono text-sm font-semibold text-foreground tabular-nums">
          {formatChartNumber(summary.medianScore)}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">Middle 50%</span>
        <span className="font-mono text-xs text-foreground tabular-nums">
          {`${formatChartNumber(summary.p25Score)} – ${formatChartNumber(summary.p75Score)}`}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">Range</span>
        <span className="flex items-center gap-1 font-mono text-xs text-foreground tabular-nums">
          <RingGlyph color={color} />
          {`${formatChartNumber(summary.minScore)} – ${formatChartNumber(summary.maxScore)}`}
          <RingGlyph color={color} />
        </span>
      </div>

      {summary.medianAccuracy !== null ? (
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-xs text-muted-foreground">Median accuracy</span>
          <span className="font-mono text-xs text-foreground tabular-nums">
            {formatPercentage(summary.medianAccuracy * 100, 2)}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function TierBoxPlotRow({
  summary,
  maxScore,
}: {
  summary: BeatmapTierScoreSummary;
  maxScore: number;
}) {
  const color = TIER_CHART_COLOR[summary.tier];

  const minPct = toScalePercent(summary.minScore, maxScore);
  const maxPct = toScalePercent(summary.maxScore, maxScore);
  const p25Pct = toScalePercent(summary.p25Score, maxScore);
  const p75Pct = toScalePercent(summary.p75Score, maxScore);
  const medianPct = toScalePercent(summary.medianScore, maxScore);

  return (
    <SimpleTooltip content={<TierTooltipContent summary={summary} />}>
      <div className="flex min-h-7 items-center gap-2">
        <TierLabel tier={summary.tier} />

        <span className="sr-only">
          {`${TIER_DISPLAY_NAME[summary.tier]}: ${formatChartNumber(summary.scoreCount)} scores, minimum ${formatChartNumber(summary.minScore)}, 25th percentile ${formatChartNumber(summary.p25Score)}, median ${formatChartNumber(summary.medianScore)}, 75th percentile ${formatChartNumber(summary.p75Score)}, maximum ${formatChartNumber(summary.maxScore)}`}
        </span>

        <div
          className="relative h-7 min-w-0 flex-1 rounded bg-muted/40"
          aria-hidden="true"
        >
          {/* Whisker: min → max, inset so the hollow rings stay hollow */}
          <div
            className="absolute top-1/2 h-px -translate-y-1/2 bg-muted-foreground/50"
            style={{
              left: `calc(${minPct}% + 5px)`,
              width: `max(0px, calc(${Math.max(maxPct - minPct, 0)}% - 10px))`,
            }}
          />
          {/* IQR box: p25 → p75 */}
          <div
            className="absolute inset-y-1.5 rounded"
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
            className="absolute inset-y-1 w-[2px] -translate-x-1/2 rounded-full bg-foreground"
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
          className="w-12 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums"
          aria-hidden="true"
        >
          {formatKilo(summary.medianScore)}
        </span>
      </div>
    </SimpleTooltip>
  );
}

function TierAccuracyRow({
  summary,
  lowerBound,
}: {
  summary: BeatmapTierScoreSummary;
  lowerBound: number;
}) {
  const color = TIER_CHART_COLOR[summary.tier];
  const accuracyPercent =
    summary.medianAccuracy === null ? null : summary.medianAccuracy * 100;

  return (
    <div className="flex min-h-7 items-center gap-2">
      <TierLabel tier={summary.tier} />

      <span className="sr-only">
        {accuracyPercent === null
          ? `${TIER_DISPLAY_NAME[summary.tier]}: no accuracy recorded`
          : `${TIER_DISPLAY_NAME[summary.tier]}: median accuracy ${formatPercentage(accuracyPercent, 2)}`}
      </span>

      <div
        className="relative h-4 min-w-0 flex-1 rounded bg-muted/40"
        aria-hidden="true"
      >
        {accuracyPercent === null ? null : (
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-background"
            style={{
              left: `${toAccuracyPercent(accuracyPercent, lowerBound)}%`,
              backgroundColor: color,
            }}
          />
        )}
      </div>

      <span
        className="w-14 shrink-0 text-right font-mono text-xs text-muted-foreground tabular-nums"
        aria-hidden="true"
      >
        {accuracyPercent === null ? '—' : formatPercentage(accuracyPercent, 2)}
      </span>
    </div>
  );
}

export default function BeatmapTierBreakdownCard({
  tierBreakdown,
  className,
}: BeatmapTierBreakdownCardProps) {
  const { tiers, ratedScoreCount, totalScoreCount } = tierBreakdown;

  const maxScore = React.useMemo(
    () => tiers.reduce((max, summary) => Math.max(max, summary.maxScore), 0),
    [tiers]
  );

  // Zoomed accuracy domain: clustered high-accuracy tiers need the spread.
  const accuracyLowerBound = React.useMemo(() => {
    const medians = tiers
      .map((summary) => summary.medianAccuracy)
      .filter((accuracy): accuracy is number => accuracy !== null)
      .map((accuracy) => accuracy * 100);

    if (medians.length === 0) return 0;

    return Math.max(0, Math.floor(Math.min(...medians)) - 1);
  }, [tiers]);

  return (
    <SectionCard data-testid="beatmap-tier-breakdown" className={cn(className)}>
      <SectionHeader
        icon={Medal}
        title="Tier breakdown"
        meta={`${formatChartNumber(ratedScoreCount)} rated scores`}
      />

      {tiers.length === 0 ? (
        <EmptyState>
          No single tier has enough rated scores to chart yet. Recent scores may
          not have a pre-match rating.
        </EmptyState>
      ) : (
        <>
          <div className="xl:grid xl:grid-cols-2 xl:divide-x">
            <div className="px-4 py-4">
              <Eyebrow>Score by tier</Eyebrow>
              <div className="mt-3 space-y-2">
                {tiers.map((summary) => (
                  <TierBoxPlotRow
                    key={summary.tier}
                    summary={summary}
                    maxScore={maxScore}
                  />
                ))}
              </div>
            </div>

            <div className="border-t px-4 py-4 xl:border-t-0">
              <Eyebrow>Accuracy by tier</Eyebrow>
              <div className="mt-3 space-y-2">
                {tiers.map((summary) => (
                  <TierAccuracyRow
                    key={summary.tier}
                    summary={summary}
                    lowerBound={accuracyLowerBound}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-28 shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
                  <span>{`${accuracyLowerBound}%`}</span>
                  <span>100%</span>
                </span>
                <span className="w-14 shrink-0" aria-hidden="true" />
              </div>
            </div>
          </div>

          <p className="border-t px-4 py-2.5 font-mono text-xs text-muted-foreground">
            {`Pre-match rating at time of play · ${formatChartNumber(ratedScoreCount)} of ${formatChartNumber(totalScoreCount)} scores have ratings · tiers with fewer than 5 scores hidden`}
          </p>
        </>
      )}
    </SectionCard>
  );
}

'use client';

import { Medal } from 'lucide-react';
import * as React from 'react';

import {
  BoxPlotTrack,
  EmptyState,
  Eyebrow,
  ScaleAxis,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import TierIcon from '@/components/icons/TierIcon';
import TapTooltip from '@/components/tap-tooltip';
import {
  formatAccuracyTick,
  formatScoreTick,
  getBoxPlotAxis,
  toAxisPercent,
  toBoxPlotMarks,
  type BoxPlotQuartiles,
  type NiceAxis,
} from '@/lib/beatmaps/chart-axis';
import { useMediaQuery } from '@/lib/hooks/useMediaQuery';
import type {
  BeatmapTierBreakdown,
  BeatmapTierScoreSummary,
} from '@/lib/orpc/schema/beatmapStats';
import { cn } from '@/lib/utils';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';
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

/**
 * Ladder display names, except that Grandmaster reads "Grandmaster+": the
 * server folds Elite Grandmaster into that bucket, so the row covers everyone
 * at Grandmaster and above.
 */
const TIER_DISPLAY_NAME: Record<TierName, string> = {
  ...tierData.reduce(
    (names, entry) => {
      names[entry.tier] = entry.displayName;
      return names;
    },
    {} as Record<TierName, string>
  ),
  Grandmaster: 'Grandmaster+',
};

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
      <span className={cn('truncate text-xs', getTierColor(tier)?.textClass)}>
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

/**
 * Shared readout for both box plot columns: the same five numbers, formatted
 * for whichever measure the row is drawn from.
 */
function TierTooltipContent({
  summary,
  measure,
  min,
  p25,
  median,
  p75,
  max,
  format,
}: {
  summary: BeatmapTierScoreSummary;
  measure: string;
  min: number;
  p25: number;
  median: number;
  p75: number;
  max: number;
  format: (value: number) => string;
}) {
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
        <span className="text-xs text-muted-foreground">
          {`${formatChartNumber(summary.scoreCount)} scores`}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">{`Median ${measure}`}</span>
        <span className="text-sm font-semibold text-foreground">
          {format(median)}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">Middle 50%</span>
        <span className="text-xs text-foreground">
          {`${format(p25)} – ${format(p75)}`}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-4">
        <span className="text-xs text-muted-foreground">Range</span>
        <span className="flex items-center gap-1 text-xs text-foreground">
          <RingGlyph color={color} />
          {`${format(min)} – ${format(max)}`}
          <RingGlyph color={color} />
        </span>
      </div>
    </div>
  );
}

function toScoreQuartiles(summary: BeatmapTierScoreSummary): BoxPlotQuartiles {
  return {
    min: summary.minScore,
    p25: summary.p25Score,
    median: summary.medianScore,
    p75: summary.p75Score,
    max: summary.maxScore,
  };
}

function TierScoreRow({
  summary,
  axis,
  gridPercents,
}: {
  summary: BeatmapTierScoreSummary;
  axis: NiceAxis;
  gridPercents: number[];
}) {
  return (
    <TapTooltip
      triggerAriaLabel={`${TIER_DISPLAY_NAME[summary.tier]} score: ${formatChartNumber(summary.scoreCount)} scores`}
      content={
        <TierTooltipContent
          summary={summary}
          measure="score"
          min={summary.minScore}
          p25={summary.p25Score}
          median={summary.medianScore}
          p75={summary.p75Score}
          max={summary.maxScore}
          format={formatChartNumber}
        />
      }
    >
      <div className="flex min-h-7 items-center gap-2">
        <TierLabel tier={summary.tier} />

        <BoxPlotTrack
          color={TIER_CHART_COLOR[summary.tier]}
          marks={toBoxPlotMarks(toScoreQuartiles(summary), axis)}
          gridPercents={gridPercents}
        />
      </div>
    </TapTooltip>
  );
}

/**
 * The accuracy quartiles for one tier as percentages, or null when the tier has
 * no accuracy recorded. The server nulls all five together, but reading them as
 * a set keeps that an assumption the type checker enforces.
 */
function toAccuracyQuartiles(summary: BeatmapTierScoreSummary) {
  const { minAccuracy, p25Accuracy, medianAccuracy, p75Accuracy, maxAccuracy } =
    summary;

  if (
    minAccuracy === null ||
    p25Accuracy === null ||
    medianAccuracy === null ||
    p75Accuracy === null ||
    maxAccuracy === null
  ) {
    return null;
  }

  return {
    min: minAccuracy * 100,
    p25: p25Accuracy * 100,
    median: medianAccuracy * 100,
    p75: p75Accuracy * 100,
    max: maxAccuracy * 100,
  };
}

function TierAccuracyRow({
  summary,
  axis,
  gridPercents,
}: {
  summary: BeatmapTierScoreSummary;
  axis: NiceAxis;
  gridPercents: number[];
}) {
  const quartiles = toAccuracyQuartiles(summary);
  const color = TIER_CHART_COLOR[summary.tier];

  if (quartiles === null) {
    return (
      <div className="flex min-h-7 items-center gap-2">
        <TierLabel tier={summary.tier} />
        <span className="sr-only">
          {`${TIER_DISPLAY_NAME[summary.tier]}: no accuracy recorded`}
        </span>
        <BoxPlotTrack color={color} marks={null} gridPercents={gridPercents} />
      </div>
    );
  }

  const format = (value: number) => formatPercentage(value, 2);

  return (
    <TapTooltip
      triggerAriaLabel={`${TIER_DISPLAY_NAME[summary.tier]} accuracy: median ${format(quartiles.median)}`}
      content={
        <TierTooltipContent
          summary={summary}
          measure="accuracy"
          min={quartiles.min}
          p25={quartiles.p25}
          median={quartiles.median}
          p75={quartiles.p75}
          max={quartiles.max}
          format={format}
        />
      }
    >
      <div className="flex min-h-7 items-center gap-2">
        <TierLabel tier={summary.tier} />

        <BoxPlotTrack
          color={color}
          marks={toBoxPlotMarks(quartiles, axis)}
          gridPercents={gridPercents}
        />
      </div>
    </TapTooltip>
  );
}

/** Axis ticks plus the interior positions the rows draw gridlines at. */
function useAxisTicks(axis: NiceAxis, format: (value: number) => string) {
  return React.useMemo(() => {
    const ticks = axis.ticks.map((value) => ({
      value,
      label: format(value),
      percent: toAxisPercent(value, axis.min, axis.max),
    }));

    return {
      ticks,
      // Endpoint ticks would just trace the edges of the track.
      gridPercents: ticks.slice(1, -1).map((tick) => tick.percent),
    };
  }, [axis, format]);
}

export default function BeatmapTierBreakdownCard({
  tierBreakdown,
  className,
}: BeatmapTierBreakdownCardProps) {
  const { tiers, ratedScoreCount, totalScoreCount } = tierBreakdown;

  // Six labels smear together on a phone-width track.
  const isNarrow = useMediaQuery('(max-width: 639px)');
  const maxTicks = isNarrow ? 4 : 6;

  // Both columns zoom onto their boxes rather than their whiskers: one quit run
  // sets a tier's minimum, and anchoring there flattens every box against the
  // far edge. Whiskers falling outside end in a chevron instead.
  const scoreAxis = React.useMemo(
    () => getBoxPlotAxis(tiers.map(toScoreQuartiles), maxTicks),
    [tiers, maxTicks]
  );

  const accuracyAxis = React.useMemo(
    () =>
      getBoxPlotAxis(
        tiers
          .map(toAccuracyQuartiles)
          .filter(
            (entry): entry is NonNullable<typeof entry> => entry !== null
          ),
        maxTicks
      ),
    [tiers, maxTicks]
  );

  const score = useAxisTicks(scoreAxis, formatScoreTick);
  const accuracy = useAxisTicks(accuracyAxis, formatAccuracyTick);

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
                  <TierScoreRow
                    key={summary.tier}
                    summary={summary}
                    axis={scoreAxis}
                    gridPercents={score.gridPercents}
                  />
                ))}
              </div>
              <ScaleAxis leftSpacerClassName="w-28" ticks={score.ticks} />
            </div>

            <div className="border-t px-4 py-4 xl:border-t-0">
              <Eyebrow>Accuracy by tier</Eyebrow>
              <div className="mt-3 space-y-2">
                {tiers.map((summary) => (
                  <TierAccuracyRow
                    key={summary.tier}
                    summary={summary}
                    axis={accuracyAxis}
                    gridPercents={accuracy.gridPercents}
                  />
                ))}
              </div>
              <ScaleAxis leftSpacerClassName="w-28" ticks={accuracy.ticks} />
            </div>
          </div>

          <p className="border-t px-4 py-2.5 text-xs text-muted-foreground">
            {`Pre-match rating at time of play · ${formatChartNumber(ratedScoreCount)} of ${formatChartNumber(totalScoreCount)} scores have ratings · tiers with fewer than 5 scores hidden`}
          </p>
        </>
      )}
    </SectionCard>
  );
}

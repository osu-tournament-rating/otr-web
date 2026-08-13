'use client';

import { Medal } from 'lucide-react';
import * as React from 'react';

import {
  BoxPlotTooltipContent,
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
  getScaleTicks,
  toBoxPlotMarks,
  type BoxPlotQuartiles,
  type NiceAxis,
} from '@/lib/beatmaps/chart-axis';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
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

/** The ladder icon fronting a tooltip header, sized to sit on a text line. */
function TierTooltipIcon({ tier }: { tier: TierName }) {
  return (
    <TierIcon tier={tier} subTier={1} tooltip={false} width={14} height={14} />
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
        <BoxPlotTooltipContent
          labelIcon={<TierTooltipIcon tier={summary.tier} />}
          label={TIER_DISPLAY_NAME[summary.tier]}
          scoreCount={summary.scoreCount}
          measureLabel="Median score"
          quartiles={toScoreQuartiles(summary)}
          color={TIER_CHART_COLOR[summary.tier]}
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
        <BoxPlotTooltipContent
          labelIcon={<TierTooltipIcon tier={summary.tier} />}
          label={TIER_DISPLAY_NAME[summary.tier]}
          scoreCount={summary.scoreCount}
          measureLabel="Median accuracy"
          quartiles={quartiles}
          color={color}
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

export default function BeatmapTierBreakdownCard({
  tierBreakdown,
  className,
}: BeatmapTierBreakdownCardProps) {
  const { tiers, ratedScoreCount, totalScoreCount } = tierBreakdown;

  // Six labels smear together on a phone-width track.
  const isNarrow = useIsNarrowChart();
  const maxTicks = isNarrow ? 4 : 6;

  // Zoomed to the boxes — see getBoxPlotAxis.
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

  const score = React.useMemo(
    () => getScaleTicks(scoreAxis, formatScoreTick),
    [scoreAxis]
  );

  const accuracy = React.useMemo(
    () => getScaleTicks(accuracyAxis, formatAccuracyTick),
    [accuracyAxis]
  );

  return (
    <SectionCard data-testid="beatmap-tier-breakdown" className={cn(className)}>
      <SectionHeader
        icon={Medal}
        title="Tier breakdown"
        meta={`${formatChartNumber(ratedScoreCount)} of ${formatChartNumber(totalScoreCount)} scores rated`}
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
            Pre-match rating at time of play · tiers with fewer than 5 scores
            hidden
          </p>
        </>
      )}
    </SectionCard>
  );
}

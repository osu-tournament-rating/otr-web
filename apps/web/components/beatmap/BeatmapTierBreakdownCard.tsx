'use client';

import { Medal } from 'lucide-react';
import * as React from 'react';

import {
  BoxPlotTooltipContent,
  BoxPlotTrack,
  FullRangeToggle,
  NotEnoughData,
  ScaleAxis,
} from '@/components/beatmap/BeatmapSection';
import { TIER_BREAKDOWN_INFO } from '@/components/beatmap/section-info';
import TierIcon from '@/components/icons/TierIcon';
import { Panel } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { Eyebrow } from '@/components/kit/layout/Typography';
import TapTooltip from '@/components/tap-tooltip';
import {
  formatAccuracyTick,
  formatScoreTick,
  getBoxPlotView,
  toBoxPlotMarks,
  type BoxPlotQuartiles,
  type NiceAxis,
} from '@/lib/beatmaps/chart-axis';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import type {
  BeatmapTierBreakdown,
  BeatmapTierScoreSummary,
} from '@/lib/orpc/schema/beatmapStats';
import { TIER_TEXT_CLASS, getTierColor } from '@/lib/kit/color/tiers';
import {
  formatCount,
  formatCountOf,
  formatPercent,
} from '@/lib/kit/format/number';
import { cn } from '@/lib/utils';
import { tierData, type TierName } from '@/lib/utils/tierData';

interface BeatmapTierBreakdownCardProps {
  tierBreakdown: BeatmapTierBreakdown;
  className?: string;
}

// Grandmaster reads "Grandmaster+"; the server folds Elite Grandmaster into it.
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
      <span className={cn('truncate text-xs', TIER_TEXT_CLASS[tier])}>
        {TIER_DISPLAY_NAME[tier]}
      </span>
    </span>
  );
}

function TierTooltipIcon({ tier }: { tier: TierName }) {
  return (
    <TierIcon tier={tier} subTier={1} tooltip={false} width={14} height={14} />
  );
}

function toScoreQuartiles(summary: BeatmapTierScoreSummary): BoxPlotQuartiles {
  return {
    min: summary.minScore,
    p20: summary.p20Score,
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
  const quartiles = toScoreQuartiles(summary);

  return (
    <TapTooltip
      triggerAriaLabel={`${TIER_DISPLAY_NAME[summary.tier]} score: ${formatCountOf(summary.scoreCount, 'score')}`}
      content={
        <BoxPlotTooltipContent
          labelIcon={<TierTooltipIcon tier={summary.tier} />}
          label={TIER_DISPLAY_NAME[summary.tier]}
          scoreCount={summary.scoreCount}
          measureLabel="Median score"
          quartiles={quartiles}
          format={formatCount}
        />
      }
    >
      <div className="flex min-h-7 items-center gap-2">
        <TierLabel tier={summary.tier} />

        <BoxPlotTrack
          color={getTierColor(summary.tier)}
          marks={toBoxPlotMarks(quartiles, axis)}
          gridPercents={gridPercents}
        />
      </div>
    </TapTooltip>
  );
}

/** Accuracy quartiles as percentages, or null when the tier has none. */
function toAccuracyQuartiles(summary: BeatmapTierScoreSummary) {
  const {
    minAccuracy,
    p20Accuracy,
    p25Accuracy,
    medianAccuracy,
    p75Accuracy,
    maxAccuracy,
  } = summary;

  if (
    minAccuracy === null ||
    p20Accuracy === null ||
    p25Accuracy === null ||
    medianAccuracy === null ||
    p75Accuracy === null ||
    maxAccuracy === null
  ) {
    return null;
  }

  return {
    min: minAccuracy * 100,
    p20: p20Accuracy * 100,
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
  const color = getTierColor(summary.tier);

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

  const format = (value: number) => formatPercent(value / 100, { decimals: 2 });

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

  const isNarrow = useIsNarrowChart();
  const maxTicks = isNarrow ? 4 : 6;

  const scoreQuartiles = React.useMemo(
    () => tiers.map(toScoreQuartiles),
    [tiers]
  );

  const accuracyQuartiles = React.useMemo(
    () =>
      tiers
        .map(toAccuracyQuartiles)
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [tiers]
  );

  // One toggle per axis: the measures have separate domains and clamp different rows.
  const [scoreExpanded, setScoreExpanded] = React.useState(false);
  const [accuracyExpanded, setAccuracyExpanded] = React.useState(false);

  const score = React.useMemo(
    () =>
      getBoxPlotView(scoreQuartiles, formatScoreTick, maxTicks, scoreExpanded),
    [scoreQuartiles, maxTicks, scoreExpanded]
  );

  const accuracy = React.useMemo(
    () =>
      getBoxPlotView(
        accuracyQuartiles,
        formatAccuracyTick,
        maxTicks,
        accuracyExpanded
      ),
    [accuracyQuartiles, maxTicks, accuracyExpanded]
  );

  return (
    <Panel data-testid="beatmap-tier-breakdown" className={className}>
      <SectionHeader
        icon={Medal}
        title="Tier breakdown"
        infoText={TIER_BREAKDOWN_INFO}
        meta={`${formatCount(ratedScoreCount)} of ${formatCountOf(totalScoreCount, 'score')} rated`}
      />

      {tiers.length === 0 ? (
        <NotEnoughData />
      ) : (
        <div className="xl:grid xl:grid-cols-2 xl:divide-x">
          <div className="px-4 py-4">
            <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <Eyebrow>Score by tier</Eyebrow>
              {score.canExpand ? (
                <FullRangeToggle
                  pressed={scoreExpanded}
                  onPressedChange={setScoreExpanded}
                  label="Full range: score by tier"
                />
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {tiers.map((summary) => (
                <TierScoreRow
                  key={summary.tier}
                  summary={summary}
                  axis={score.axis}
                  gridPercents={score.gridPercents}
                />
              ))}
            </div>
            <ScaleAxis leftSpacerClassName="w-28" ticks={score.ticks} />
          </div>

          <div className="border-t px-4 py-4 xl:border-t-0">
            <div className="flex min-h-6 flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <Eyebrow>Accuracy by tier</Eyebrow>
              {accuracy.canExpand ? (
                <FullRangeToggle
                  pressed={accuracyExpanded}
                  onPressedChange={setAccuracyExpanded}
                  label="Full range: accuracy by tier"
                />
              ) : null}
            </div>
            <div className="mt-3 space-y-2">
              {tiers.map((summary) => (
                <TierAccuracyRow
                  key={summary.tier}
                  summary={summary}
                  axis={accuracy.axis}
                  gridPercents={accuracy.gridPercents}
                />
              ))}
            </div>
            <ScaleAxis leftSpacerClassName="w-28" ticks={accuracy.ticks} />
          </div>
        </div>
      )}
    </Panel>
  );
}

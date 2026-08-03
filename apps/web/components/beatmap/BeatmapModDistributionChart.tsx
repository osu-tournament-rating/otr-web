'use client';

import { ListFilter } from 'lucide-react';
import * as React from 'react';

import {
  EmptyState,
  SectionCard,
  SectionHeader,
} from '@/components/beatmap/BeatmapSection';
import type { BeatmapModDistribution } from '@/lib/orpc/schema/beatmapStats';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';
import {
  BEATMAP_MOD_OTHER_LABEL,
  calculateBeatmapModDistribution,
  collapseBeatmapModDistribution,
  getModColor,
} from '@/lib/utils/mods';

interface BeatmapModDistributionChartProps {
  modStats: BeatmapModDistribution[];
  className?: string;
}

export default function BeatmapModDistributionChart({
  modStats,
  className,
}: BeatmapModDistributionChartProps) {
  const segments = React.useMemo(
    () =>
      collapseBeatmapModDistribution(
        calculateBeatmapModDistribution(modStats)
      ).map(({ label, mods, scoreCount, percentage }) => ({
        label,
        scoreCount,
        percentage,
        percentageLabel: formatPercentage(percentage, 1),
        fill:
          label === BEATMAP_MOD_OTHER_LABEL
            ? 'var(--muted-foreground)'
            : getModColor(mods),
      })),
    [modStats]
  );

  const totalScoreCount = React.useMemo(
    () => segments.reduce((total, segment) => total + segment.scoreCount, 0),
    [segments]
  );

  return (
    <SectionCard
      data-testid="beatmap-mod-distribution-chart"
      className={className}
    >
      <SectionHeader
        icon={ListFilter}
        title="Mod distribution"
        meta={
          segments.length > 0
            ? `${formatChartNumber(totalScoreCount)} scores`
            : undefined
        }
      />

      {segments.length === 0 ? (
        <EmptyState>No mod data available.</EmptyState>
      ) : (
        <div className="space-y-3 px-4 py-4">
          {/* The legend below carries the same values as text, so the bar is
              presentational only. */}
          <div
            data-testid="beatmap-mod-distribution-bar"
            className="flex h-7 w-full gap-[2px]"
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

          <ul
            aria-label="Mod distribution"
            className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs"
          >
            {segments.map((segment) => (
              <li key={segment.label} className="flex items-center gap-1.5">
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
        </div>
      )}
    </SectionCard>
  );
}

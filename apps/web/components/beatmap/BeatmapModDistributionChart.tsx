'use client';

import { ListFilter } from 'lucide-react';
import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card
      data-testid="beatmap-mod-distribution-chart"
      className={`gap-0 overflow-hidden py-0 ${className ?? ''}`}
    >
      <CardHeader className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListFilter
              className="size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <CardTitle className="leading-6">Mod distribution</CardTitle>
          </div>
          {segments.length > 0 && (
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {formatChartNumber(totalScoreCount)} scores
            </span>
          )}
        </div>
      </CardHeader>

      {segments.length === 0 ? (
        <CardContent className="flex h-[88px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
          No mod data available.
        </CardContent>
      ) : (
        <CardContent className="space-y-3 px-4 py-4">
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
        </CardContent>
      )}
    </Card>
  );
}

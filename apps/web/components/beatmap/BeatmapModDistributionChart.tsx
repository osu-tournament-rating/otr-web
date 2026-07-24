'use client';

import { ListFilter } from 'lucide-react';
import * as React from 'react';
import { Cell, Pie, PieChart } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { BeatmapModDistribution } from '@/lib/orpc/schema/beatmapStats';
import { formatPercentage } from '@/lib/utils/chart';
import {
  calculateBeatmapModDistribution,
  filterBeatmapModDistribution,
  getModColor,
} from '@/lib/utils/mods';

interface BeatmapModDistributionChartProps {
  modStats: BeatmapModDistribution[];
  className?: string;
}

const chartConfig = {
  count: {
    label: 'Scores',
    color: 'var(--foreground)',
  },
} satisfies ChartConfig;

export default function BeatmapModDistributionChart({
  modStats,
  className,
}: BeatmapModDistributionChartProps) {
  const processedData = React.useMemo(() => {
    if (modStats.length === 0) return [];

    return filterBeatmapModDistribution(
      calculateBeatmapModDistribution(modStats)
    )
      .slice(0, 6)
      .map(({ label, mods, scoreCount, percentage }) => ({
        label,
        count: scoreCount,
        percentage,
        percentageLabel: formatPercentage(percentage, 0),
        fill: getModColor(mods),
      }));
  }, [modStats]);

  return (
    <Card
      data-testid="beatmap-mod-distribution-chart"
      className={`gap-0 overflow-hidden py-0 ${className ?? ''}`}
    >
      <CardHeader className="h-[49px] border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ListFilter
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle>Mod distribution</CardTitle>
        </div>
      </CardHeader>

      {processedData.length === 0 ? (
        <CardContent className="flex h-[282px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
          No mod data available.
        </CardContent>
      ) : (
        <CardContent className="flex h-[282px] items-center gap-2 px-2 py-4 sm:gap-4 sm:px-4">
          <ChartContainer
            config={chartConfig}
            className="h-[250px] min-h-[250px] min-w-0 flex-1"
          >
            <PieChart accessibilityLayer>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="label"
                    indicator="dot"
                    className="font-sans"
                  />
                }
              />
              <Pie
                data={processedData}
                dataKey="count"
                nameKey="label"
                innerRadius="45%"
                outerRadius="72%"
                paddingAngle={2}
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {processedData.map((entry) => (
                  <Cell key={entry.label} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul
            aria-label="Mod distribution legend"
            className="grid w-[7.5rem] shrink-0 content-center gap-2 text-xs sm:w-[8.5rem]"
          >
            {processedData.map((entry) => (
              <li
                key={entry.label}
                className="grid grid-cols-[0.5rem_minmax(0,1fr)_auto] items-center gap-2"
              >
                <span
                  className="size-2 rounded-[2px]"
                  style={{ backgroundColor: entry.fill }}
                  aria-hidden="true"
                />
                <span className="truncate font-medium">{entry.label}</span>
                <span className="font-mono text-muted-foreground tabular-nums">
                  {entry.percentageLabel}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  );
}

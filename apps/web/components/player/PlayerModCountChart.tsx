'use client';

import { ChartPie } from 'lucide-react';
import { useMemo } from 'react';
import { Cell, Label, Pie, PieChart } from 'recharts';

import { ChartLegend } from '@/components/kit/charts/ChartLegend';
import { ChartTooltipContent } from '@/components/kit/charts/ChartTooltip';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { formatCountTick } from '@/lib/kit/charts/format';
import { formatCount, formatPercent } from '@/lib/kit/format/number';
import type { PlayerModStats } from '@/lib/orpc/schema/playerStats';
import { cn } from '@/lib/utils';

import { groupModStats } from './mod-stats';
import { MOD_DISTRIBUTION_INFO as INFO_TEXT } from './section-info';

/** How a player's games split across mods, as a donut in the mod palette. */
export default function PlayerModCountChart({
  modStats,
  className,
}: {
  modStats: PlayerModStats[];
  className?: string;
}) {
  const chartData = useMemo(() => groupModStats(modStats, 'count'), [modStats]);
  const totalGames = chartData.reduce((sum, entry) => sum + entry.count, 0);

  if (chartData.length === 0) {
    return (
      <Panel className={className}>
        <SectionHeader
          icon={ChartPie}
          title="Mod distribution"
          infoText={INFO_TEXT}
        />
        <EmptyState
          size="compact"
          icon={ChartPie}
          title="No mod data available"
        />
      </Panel>
    );
  }

  return (
    <Panel className={cn('flex flex-col', className)}>
      <SectionHeader
        icon={ChartPie}
        title="Mod distribution"
        infoText={INFO_TEXT}
      />
      <PanelBody className="flex flex-1 flex-col gap-3">
        <ChartLegend
          items={chartData.map((entry) => ({
            key: entry.label,
            label: (
              <span>
                {entry.label}{' '}
                <span className="text-foreground tabular-nums">
                  {formatPercent(entry.count / totalGames)}
                </span>
              </span>
            ),
            color: entry.fill,
          }))}
        />
        <ChartContainer
          config={{}}
          className="aspect-auto min-h-60 w-full flex-1"
        >
          <PieChart>
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="label"
              innerRadius="58%"
              outerRadius="90%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) {
                    return null;
                  }
                  const cx = viewBox.cx ?? 0;
                  const cy = viewBox.cy ?? 0;

                  return (
                    <text x={cx} y={cy} textAnchor="middle">
                      <tspan
                        x={cx}
                        y={cy - 2}
                        className="fill-foreground text-2xl font-bold tabular-nums"
                      >
                        {formatCount(totalGames)}
                      </tspan>
                      <tspan
                        x={cx}
                        y={cy + 18}
                        className="fill-muted-foreground text-xs"
                      >
                        Games
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(value) =>
                    `${formatCountTick(value)} (${formatPercent(value / totalGames)})`
                  }
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </PanelBody>
    </Panel>
  );
}

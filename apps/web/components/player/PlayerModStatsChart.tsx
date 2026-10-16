'use client';

import { Mods } from '@otr/core/osu';
import { ChartBarBig } from 'lucide-react';
import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';

import { ChartTooltipContent } from '@/components/kit/charts/ChartTooltip';
import { EmptyState } from '@/components/kit/feedback/EmptyState';
import { Panel, PanelBody } from '@/components/kit/layout/Panel';
import { SectionHeader } from '@/components/kit/layout/SectionHeader';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { useIsNarrowChart } from '@/lib/hooks/useMediaQuery';
import {
  CHART_CURSOR,
  CHART_MARGIN,
  chartAxisProps,
  niceAxisProps,
} from '@/lib/kit/charts/axis';
import { formatCompactTick, formatCountTick } from '@/lib/kit/charts/format';
import {
  DEFAULT_MAX_TICKS,
  NARROW_MAX_TICKS,
  getNiceTicks,
} from '@/lib/kit/charts/ticks';
import type { PlayerModStats } from '@/lib/orpc/schema/playerStats';
import { MOD_CHART_DISPLAY_THRESHOLD } from '@/lib/utils/playerModCharts';
import { cn } from '@/lib/utils';

import { groupModStats } from './mod-stats';

const BAR_SIZE = 24;
const ROW_HEIGHT = 36;
const AXIS_HEIGHT = 32;
// The last tick label is centred on the plot's edge; leave it room.
const MARGIN = { ...CHART_MARGIN, right: 24 };
// Rounded at the data end, square at the axis.
const HORIZONTAL_BAR_RADIUS: [number, number, number, number] = [0, 4, 4, 0];

/**
 * Average score per mod, with the mod multipliers removed, as horizontal
 * bars in the mod palette.
 */
export default function PlayerModStatsChart({
  className,
  modStats,
}: {
  className?: string;
  modStats: PlayerModStats[];
}) {
  const maxTicks = useIsNarrowChart() ? NARROW_MAX_TICKS : DEFAULT_MAX_TICKS;
  const chartData = useMemo(
    () => groupModStats(modStats, 'averageScore'),
    [modStats]
  );
  const hasEasyMod = chartData.some((entry) => entry.mods & Mods.Easy);

  const infoText = (
    <>
      Mods played in at least {MOD_CHART_DISPLAY_THRESHOLD}% of all verified
      ScoreV2 games.
      {hasEasyMod ? ' All EZ scores are multiplied by 1.75x.' : null}
    </>
  );

  if (chartData.length === 0) {
    return (
      <Panel className={className}>
        <SectionHeader
          icon={ChartBarBig}
          title="Mod performance"
          infoText={infoText}
        />
        <EmptyState
          size="compact"
          icon={ChartBarBig}
          title="No mod performance data available"
        />
      </Panel>
    );
  }

  const xTicks = getNiceTicks(
    0,
    Math.max(...chartData.map((entry) => entry.averageScore)),
    { integer: true, maxTicks }
  );

  return (
    <Panel className={cn('flex flex-col', className)}>
      <SectionHeader
        icon={ChartBarBig}
        title="Mod performance"
        infoText={infoText}
      />
      <PanelBody className="flex flex-1 flex-col justify-center">
        <ChartContainer
          config={{}}
          className="aspect-auto w-full"
          style={{ height: chartData.length * ROW_HEIGHT + AXIS_HEIGHT }}
        >
          <BarChart data={chartData} layout="vertical" margin={MARGIN}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis
              {...chartAxisProps}
              {...niceAxisProps(xTicks)}
              tickFormatter={formatCompactTick}
            />
            <YAxis
              {...chartAxisProps}
              dataKey="label"
              type="category"
              width="auto"
              interval={0}
            />
            <ChartTooltip
              cursor={CHART_CURSOR.bar}
              content={
                <ChartTooltipContent
                  nameFormatter={() => 'Average score'}
                  valueFormatter={formatCountTick}
                />
              }
            />
            <Bar
              dataKey="averageScore"
              name="Average score"
              barSize={BAR_SIZE}
              radius={HORIZONTAL_BAR_RADIUS}
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </PanelBody>
    </Panel>
  );
}

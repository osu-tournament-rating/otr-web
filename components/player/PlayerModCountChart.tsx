'use client';

import { ModsEnumHelper } from '@/lib/enums';
import { PlayerModStatsDTO } from '@osu-tournament-rating/otr-api-client';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { PieChart, Pie, Label } from 'recharts';
import * as React from 'react';
import { getModColor } from '@/lib/utils/mods';
import { MOD_CHART_DISPLAY_THRESHOLD } from '@/lib/utils/playerModCharts';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';

interface ProcessedEntry {
  label: string;
  count: number;
  fill: string;
}

interface PlayerModCountChartProps {
  modStats: PlayerModStatsDTO[];
  className?: string;
}

export default function PlayerModCountChart({
  modStats,
  className,
}: PlayerModCountChartProps) {
  // Process mod stats data
  const processedData = React.useMemo(() => {
    if (!modStats || modStats.length === 0) {
      return [];
    }
    // Create a map to aggregate counts by mod combination
    const modMap = new Map<string, ProcessedEntry>();

    // Process mod stats
    modStats.forEach((stat) => {
      const metadata = ModsEnumHelper.getMetadata(stat.mods);
      // Join mod texts and remove all "NF" occurrences
      let label = metadata
        .map((meta) => meta.text)
        .join('')
        .replace(/NF/g, '');

      // If label is empty, it's "No Mod" (NM)
      if (label === '') {
        label = 'NM';
      }

      const count = stat.count || 1;

      // If this mod combination already exists in our map, update it
      if (modMap.has(label)) {
        const existing = modMap.get(label)!;
        modMap.set(label, {
          ...existing,
          count: existing.count + count,
        });
      } else {
        // Add new entry
        modMap.set(label, {
          label,
          count,
          fill: getModColor(stat.mods),
        });
      }
    });

    return Array.from(modMap.values()).sort((a, b) => b.count - a.count);
  }, [modStats]);

  // Calculate total games for percentage display and center label
  const totalGames = React.useMemo(() => {
    return processedData.reduce((sum, entry) => sum + entry.count, 0);
  }, [processedData]);

  const chartConfig: ChartConfig = {
    count: {
      label: 'Games',
      color: 'hsl(var(--chart-1))',
    },
  };

  const renderCenterLabel = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => {
      const { viewBox } = props;
      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
        return (
          <text
            x={viewBox.cx}
            y={viewBox.cy}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            <tspan
              x={viewBox.cx}
              y={viewBox.cy}
              className="fill-foreground text-3xl font-bold"
            >
              {formatChartNumber(totalGames)}
            </tspan>
            <tspan
              x={viewBox.cx}
              y={(viewBox.cy || 0) + 24}
              className="fill-muted-foreground"
            >
              Games
            </tspan>
          </text>
        );
      }
      return null;
    },
    [totalGames]
  );

  if (processedData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="items-center">
          <CardTitle>Mod Distribution</CardTitle>
          <CardDescription>No mod data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="items-center">
        <CardTitle>Mod Distribution</CardTitle>
        <CardDescription>
          Displaying mods played in &ge;{MOD_CHART_DISPLAY_THRESHOLD}% of all
          verified games
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0 font-sans">
        <ChartContainer config={chartConfig} className="min-h-[190px] w-full">
          <PieChart>
            <Pie
              data={processedData}
              innerRadius="50%"
              outerRadius="70%"
              paddingAngle={3}
              dataKey="count"
              nameKey="label"
              label={({ name, percent }) =>
                `${name} (${formatPercentage(percent * 100, 1)})`
              }
            >
              <Label content={renderCenterLabel} />
            </Pie>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  className="font-sans"
                  labelFormatter={(value, payload) => {
                    if (payload && payload.length > 0 && payload[0].payload) {
                      return payload[0].payload.label;
                    }
                    return value;
                  }}
                />
              }
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

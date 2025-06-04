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
import { PieChart, Pie, Label, Cell } from 'recharts';
import * as React from 'react';
import { getModColor } from '@/lib/utils/mods';

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

    // Filter for entries with count >= 10 and sort by count (descending)
    return Array.from(modMap.values())
      .filter((entry) => entry.count >= 10)
      .sort((a, b) => b.count - a.count);
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
              className="fill-foreground text-2xl font-bold sm:text-3xl"
            >
              {totalGames.toLocaleString()}
            </tspan>
            <tspan
              x={viewBox.cx}
              y={(viewBox.cy || 0) + 20}
              className="fill-muted-foreground text-sm"
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

  const renderCustomLabel = React.useCallback(
    ({
      cx,
      cy,
      midAngle,
      innerRadius,
      outerRadius,
      percent,
      name,
    }: {
      cx: number;
      cy: number;
      midAngle: number;
      innerRadius: number;
      outerRadius: number;
      percent: number;
      name: string;
    }) => {
      // Only show labels for slices with >= 8% to avoid overcrowding on mobile
      if (percent < 0.08) return null;

      const RADIAN = Math.PI / 180;
      // Reduce label radius to keep them closer to the chart
      const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      return (
        <text
          x={x}
          y={y}
          fill="currentColor"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          className="fill-foreground text-xs font-medium"
        >
          {`${name} (${(percent * 100).toFixed(0)}%)`}
        </text>
      );
    },
    []
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
      <CardHeader className="items-center pb-2">
        <CardTitle>Mod Distribution</CardTitle>
        <CardDescription>Games played (min. 10 games)</CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden pb-4 font-sans">
        <ChartContainer
          config={chartConfig}
          className="mx-auto !aspect-auto h-[280px] w-full max-w-[280px] overflow-hidden sm:h-[320px] sm:max-w-[320px]"
        >
          <PieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius="65%"
              innerRadius="45%"
              paddingAngle={2}
              dataKey="count"
              nameKey="label"
            >
              {processedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
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

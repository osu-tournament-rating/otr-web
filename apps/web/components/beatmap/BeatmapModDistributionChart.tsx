'use client';

import * as React from 'react';
import { ModsEnumHelper } from '@/lib/enum-helpers';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Label } from 'recharts';
import { getModColor } from '@/lib/utils/mods';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';
import type { BeatmapModDistribution } from '@/lib/orpc/schema/beatmapStats';

interface ProcessedEntry {
  label: string;
  count: number;
  fill: string;
}

interface BeatmapModDistributionChartProps {
  modStats: BeatmapModDistribution[];
  className?: string;
}

const MOD_CHART_DISPLAY_THRESHOLD = 1.0;

export default function BeatmapModDistributionChart({
  modStats,
  className,
}: BeatmapModDistributionChartProps) {
  const processedData = React.useMemo(() => {
    if (!modStats || modStats.length === 0) {
      return [];
    }

    const totalGames = modStats.reduce((sum, stat) => sum + stat.scoreCount, 0);
    const threshold = (totalGames * MOD_CHART_DISPLAY_THRESHOLD) / 100.0;

    const modMap = new Map<string, ProcessedEntry>();

    modStats.forEach((stat) => {
      const metadata = ModsEnumHelper.getMetadata(stat.mods);
      let label = metadata
        .map((meta) => meta.text)
        .join('')
        .replace(/NF/g, '')
        .replace(/SO/g, '');

      if (label === '') {
        label = 'NM';
      }

      const count = stat.scoreCount || 1;

      if (modMap.has(label)) {
        const existing = modMap.get(label)!;
        modMap.set(label, {
          ...existing,
          count: existing.count + count,
        });
      } else {
        modMap.set(label, {
          label,
          count,
          fill: getModColor(stat.mods),
        });
      }
    });

    return Array.from(modMap.values())
      .filter((entry) => entry.count >= threshold)
      .sort((a, b) => b.count - a.count);
  }, [modStats]);

  const totalGames = React.useMemo(() => {
    return processedData.reduce((sum, entry) => sum + entry.count, 0);
  }, [processedData]);

  const chartConfig: ChartConfig = {
    count: {
      label: 'Scores',
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
              Scores
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
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center text-sm">
            No mod data available for this beatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="items-center">
        <CardTitle>Mod Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pb-0 font-sans">
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <PieChart>
            <Pie
              data={processedData}
              innerRadius="40%"
              outerRadius="55%"
              paddingAngle={3}
              dataKey="count"
              nameKey="label"
              label={({ name, percent }) =>
                `${name} (${formatPercentage((percent ?? 0) * 100, 1)})`
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

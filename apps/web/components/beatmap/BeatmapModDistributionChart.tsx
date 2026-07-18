'use client';

import * as React from 'react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Label } from 'recharts';
import {
  calculateBeatmapModDistribution,
  filterBeatmapModDistribution,
  getModColor,
} from '@/lib/utils/mods';
import { formatChartNumber, formatPercentage } from '@/lib/utils/chart';
import type { BeatmapModDistribution } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapModDistributionChartProps {
  modStats: BeatmapModDistribution[];
  className?: string;
}

export default function BeatmapModDistributionChart({
  modStats,
  className,
}: BeatmapModDistributionChartProps) {
  const processedData = React.useMemo(() => {
    if (!modStats || modStats.length === 0) {
      return [];
    }

    return filterBeatmapModDistribution(
      calculateBeatmapModDistribution(modStats)
    ).map(({ label, mods, scoreCount, percentage }) => ({
      label,
      count: scoreCount,
      percentage,
      fill: getModColor(mods),
    }));
  }, [modStats]);

  const totalScores = React.useMemo(() => {
    return modStats.reduce((sum, entry) => sum + entry.scoreCount, 0);
  }, [modStats]);

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
              {formatChartNumber(totalScores)}
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
    [totalScores]
  );

  if (processedData.length === 0) {
    return (
      <Card data-testid="beatmap-mod-distribution-chart" className={className}>
        <CardHeader className="items-center">
          <CardTitle>Mod Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No mod data available for this beatmap.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="beatmap-mod-distribution-chart" className={className}>
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
              label={({ name, payload }) =>
                `${name} (${formatPercentage(payload.percentage, 1)})`
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

'use client';

import { useMemo } from 'react';
import { BarChart, XAxis, YAxis, Bar } from 'recharts';
import { PlayerModStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { ModsEnumHelper } from '@/lib/enums';
import { getModColor, normalizedScore } from '@/lib/utils/mods';
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

interface ChartDataEntry {
  label: string;
  averageScore: number;
  count: number;
  fill: string;
}

interface PlayerModStatsChartProps {
  className?: string;
  modStats: PlayerModStatsDTO[];
}

export default function PlayerModStatsChart({
  className,
  modStats,
}: PlayerModStatsChartProps) {
  const chartConfig: ChartConfig = {
    averageScore: {
      label: 'Score',
      color: 'hsl(var(--chart-1))',
    },
  };

  // Process mod stats data
  const chartData = useMemo(() => {
    if (!modStats || modStats.length === 0) {
      return [];
    }
    // Create a map to aggregate scores by mod combination
    const modMap = new Map<string, ChartDataEntry>();

    // Process and normalize scores
    modStats.forEach((stat) => {
      // Normalize the score using the utility function
      const normalizedAverageScore = normalizedScore(
        stat.mods,
        stat.averageScore
      );

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
        const totalCount = existing.count + count;
        const weightedSum =
          existing.averageScore * existing.count +
          normalizedAverageScore * count;

        modMap.set(label, {
          label,
          averageScore: Math.round(weightedSum / totalCount),
          count: totalCount,
          fill: getModColor(stat.mods),
        });
      } else {
        // Add new entry
        modMap.set(label, {
          label,
          averageScore: normalizedAverageScore,
          count,
          fill: getModColor(stat.mods),
        });
      }
    });

    // Filter for entries with count >= 10 and sort by average score (highest first)
    return Array.from(modMap.values())
      .filter((entry) => entry.count >= 10)
      .map(({ label, averageScore, fill }) => ({
        label,
        averageScore,
        fill,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);
  }, [modStats]);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="items-center">
          <CardTitle>Mod Performance</CardTitle>
          <CardDescription>No mod performance data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="items-center pb-2">
        <CardTitle>Mod Performance</CardTitle>
        <CardDescription>
          Average normalized score (min. 10 games)
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden pb-4 font-sans">
        <ChartContainer
          config={chartConfig}
          className="mx-auto !aspect-auto h-[280px] w-full overflow-hidden sm:h-[320px]"
        >
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
          >
            <XAxis
              type="number"
              ticks={[0, 200_000, 400_000, 600_000, 800_000]}
              tickFormatter={(value) =>
                value > 0 ? `${(value / 1000).toFixed(0)}k` : '0'
              }
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              dataKey="label"
              type="category"
              tick={{ fontSize: 11 }}
              interval={0}
              width={40}
              tickLine={false}
              axisLine={false}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  formatter={(value) => [
                    `${Number(value).toLocaleString()}`,
                    'Score',
                  ]}
                />
              }
            />
            <Bar
              dataKey="averageScore"
              radius={[0, 4, 4, 0]}
              barSize={Math.min(
                30,
                Math.max(15, 280 / Math.max(chartData.length, 1) - 5)
              )}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

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
      <CardHeader className="items-center">
        <CardTitle>Mod Performance</CardTitle>
        <CardDescription>
          Average normalized score (min. 10 games)
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0 overflow-hidden font-sans">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] w-full pb-0 sm:h-[320px] sm:max-w-[320px] [&_.recharts-pie-label-text]:font-sans"
        >
          <BarChart data={chartData} layout="vertical">
            <XAxis
              type="number"
              ticks={[0, 200_000, 400_000, 600_000, 800_000]}
              tickFormatter={(value) =>
                value > 0 ? `${(value / 1000).toFixed(0)}k` : '0'
              }
            />
            <YAxis
              dataKey="label"
              type="category"
              tick={{ fontSize: 12 }}
              interval={0}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Bar dataKey="averageScore" radius={[0, 4, 4, 0]} barSize={30} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

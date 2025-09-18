'use client';

import { useMemo } from 'react';
import { BarChart, XAxis, YAxis, Bar } from 'recharts';
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
import { InfoIcon } from 'lucide-react';
import SimpleTooltip from '../simple-tooltip';
import { MOD_CHART_DISPLAY_THRESHOLD } from '@/lib/utils/playerModCharts';
import { formatChartNumber } from '@/lib/utils/chart';
import type { PlayerModStats } from '@/lib/orpc/schema/playerDashboard';
import { Mods } from '@/lib/osu/enums';

interface ChartDataEntry {
  label: string;
  averageScore: number;
  count: number;
  fill: string;
}

interface PlayerModStatsChartProps {
  className?: string;
  modStats: PlayerModStats[];
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

    return Array.from(modMap.values())
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

  // Display a tooltip if the player has played at least MOD_CHART_DISPLAY_THRESHOLD% of all verified games with the Easy mod
  const hasEasyMod =
    modStats.filter((stat) => stat.mods & Mods.Easy).length >=
    modStats.length * MOD_CHART_DISPLAY_THRESHOLD;

  return (
    <Card className={className}>
      <CardHeader className="items-center">
        <CardTitle className="flex flex-row gap-2">
          <span>Mod Performance</span>
          {hasEasyMod && (
            <span className="flex items-center">
              <SimpleTooltip content="All EZ scores are multiplied by 1.75x">
                <InfoIcon className="h-5 w-5 text-muted-foreground" />
              </SimpleTooltip>
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Displaying mods played in &ge;{MOD_CHART_DISPLAY_THRESHOLD}% of all
          verified games
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-hidden pb-0 font-sans">
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <BarChart data={chartData} layout="vertical">
            <XAxis
              type="number"
              ticks={[0, 200_000, 400_000, 600_000, 800_000]}
              tickFormatter={(value) =>
                value > 0 ? `${formatChartNumber(value / 1000)}k` : '0'
              }
            />
            <YAxis
              dataKey="label"
              type="category"
              tick={{ fontSize: 12 }}
              interval={0}
            />
            <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
            <Bar dataKey="averageScore" radius={[0, 4, 4, 0]} barSize={26} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

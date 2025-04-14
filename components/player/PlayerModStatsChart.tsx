'use client';

import { useMemo } from 'react';
import { BarChart, CartesianGrid, XAxis, YAxis, Bar, Cell } from 'recharts';
import { Mods, PlayerModStatsDTO } from '@osu-tournament-rating/otr-api-client';
import { ModsEnumHelper } from '@/lib/enums';
import { normalizedScore } from '@/lib/utils/mods';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';

interface ChartDataEntry {
  label: string;
  averageScore: number;
  count: number;
  color: string;
}

export default function PlayerModStatsChart({
  className,
  modStats,
}: {
  className?: string;
  modStats: PlayerModStatsDTO[];
}) {
  const modColors = {
    [Mods.HardRock]: 'var(--mod-hard-rock)',
    [Mods.Hidden]: 'var(--mod-hidden)',
    [Mods.DoubleTime]: 'var(--mod-double-time)',
    [Mods.Nightcore]: 'var(--mod-nightcore)',
    [Mods.Flashlight]: 'var(--mod-flashlight)',
    [Mods.Easy]: 'var(--mod-easy)',
    [Mods.Hidden | Mods.HardRock]: 'var(--mod-hd-hr)',
    [Mods.Hidden | Mods.Easy]: 'var(--mod-hd-easy)',
    [Mods.Easy | Mods.DoubleTime]: 'var(--mod-easy-double-time)',
  };

  function getModColor(mods: Mods) {
    const removeNoFail = mods & ~Mods.NoFail;
    for (const [mod, color] of Object.entries(modColors)) {
      if (removeNoFail === Number(mod)) {
        return color;
      }
    }

    return 'var(--chart-1)';
  }

  const chartConfig: ChartConfig = {
    averageScore: {
      label: 'Score',
      color: 'hsl(var(--chart-1))',
    },
  };

  // Process mod stats data
  const chartData = useMemo(() => {
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
          color: getModColor(stat.mods),
        });
      } else {
        // Add new entry
        modMap.set(label, {
          label,
          averageScore: normalizedAverageScore,
          count,
          color: getModColor(stat.mods),
        });
      }
    });

    // Filter for entries with count >= 10 and sort by average score (highest first)
    return Array.from(modMap.values())
      .filter((entry) => entry.count >= 10)
      .map(({ label, averageScore, color }) => ({
        label,
        averageScore,
        color,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);
  }, [modStats, getModColor]);

  return (
    <Card className={className}>
      <CardHeader className="items-center">
        <CardTitle>Mod Performance</CardTitle>
        <CardDescription>
          Average score across all games, normalized to{' '}
          {Number(1_000_000).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0 font-sans">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] w-full pb-0 [&_.recharts-pie-label-text]:font-sans"
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
            <ChartTooltip content={<ChartTooltipContent color='var(--primary)' />} />
            <Bar dataKey="averageScore" radius={[0, 4, 4, 0]} barSize={30}>
              {chartData.map((entry, index) => (
                <Cell key={`bar-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2 text-sm leading-none text-muted-foreground">
        <p>Showing mods played in ten or more games</p>
      </CardFooter>
    </Card>
  );
}

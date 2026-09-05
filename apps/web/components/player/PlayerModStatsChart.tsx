'use client';

import { useMemo } from 'react';
import { BarChart, XAxis, YAxis, Bar } from 'recharts';
import { ModsEnumHelper } from '@/lib/enum-helpers';
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
import type { PlayerModStats } from '@/lib/orpc/schema/playerStats';
import { Mods } from '@otr/core/osu';

interface ChartDataEntry {
  label: string;
  averageScore: number;
  count: number;
  fill: string;
  mods: number;
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

  const chartData = useMemo(() => {
    if (!modStats || modStats.length === 0) {
      return [];
    }

    const totalGames = modStats.reduce((sum, stat) => sum + stat.count, 0);
    const threshold = (totalGames * MOD_CHART_DISPLAY_THRESHOLD) / 100.0;

    const modMap = new Map<string, ChartDataEntry>();

    modStats.forEach((stat) => {
      const normalizedAverageScore = normalizedScore(
        stat.mods,
        stat.averageScore
      );

      const metadata = ModsEnumHelper.getMetadata(stat.mods);
      let label = metadata
        .map((meta) => meta.text)
        .join('')
        .replace(/NF/g, '')
        .replace(/SO/g, '');

      if (label === '') {
        label = 'NM';
      }

      const count = stat.count || 1;

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
          mods: existing.mods | stat.mods,
        });
      } else {
        modMap.set(label, {
          label,
          averageScore: normalizedAverageScore,
          count,
          fill: getModColor(stat.mods),
          mods: stat.mods,
        });
      }
    });

    return Array.from(modMap.values())
      .filter((entry) => entry.count >= threshold)
      .map(({ label, averageScore, fill, mods }) => ({
        label,
        averageScore,
        fill,
        mods,
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

  const hasEasyMod = chartData.some((entry) => entry.mods & Mods.Easy);

  return (
    <Card className={className}>
      <CardHeader className="items-center">
        <CardTitle className="flex items-center gap-2">
          <span>Mod Performance</span>
          {hasEasyMod && (
            <SimpleTooltip
              content="All EZ scores are multiplied by 1.75x"
              triggerAriaLabel="About EZ scores"
            >
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </SimpleTooltip>
          )}
        </CardTitle>
        <CardDescription>
          Displaying mods played in &ge;{MOD_CHART_DISPLAY_THRESHOLD}% of all
          verified ScoreV2 games
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
              tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
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

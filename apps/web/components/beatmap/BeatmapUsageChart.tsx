'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ChartContainer, ChartConfig } from '../ui/chart';
import type { BeatmapUsagePoint } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapUsageChartProps {
  data: BeatmapUsagePoint[];
  className?: string;
}

const getChartColors = (theme?: string) => ({
  games: '#3b82f6',
  pooled: '#f59e0b',
  grid: theme === 'dark' ? 'rgba(55, 65, 81, 0.4)' : 'rgba(156, 163, 175, 0.4)',
  text: theme === 'dark' ? '#d1d5db' : '#4b5563',
});

const QUARTER_RANGES: Record<number, { start: string; end: string }> = {
  1: { start: 'Jan', end: 'Mar' },
  2: { start: 'Apr', end: 'Jun' },
  3: { start: 'Jul', end: 'Sep' },
  4: { start: 'Oct', end: 'Dec' },
};

const formatQuarterTick = (quarter: string): string => {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return quarter;

  const year = match[1];
  const quarterNum = parseInt(match[2], 10);
  const range = QUARTER_RANGES[quarterNum];

  return `${range.start} - ${range.end} ${year}`;
};

export default function BeatmapUsageChart({
  data,
  className,
}: BeatmapUsageChartProps) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  const chartConfig: ChartConfig = {
    gameCount: {
      label: 'Games Played',
      color: colors.games,
    },
    pooledCount: {
      label: 'Tournaments Pooled',
      color: colors.pooled,
    },
  };

  const maxGames = Math.max(...data.map((d) => d.gameCount), 1);
  const maxPooled = Math.max(...data.map((d) => d.pooledCount), 1);
  const yAxisGamesMax = Math.ceil(maxGames * 1.1);
  const yAxisPooledMax = Math.ceil(maxPooled * 1.1);

  if (data.length < 2) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex flex-row items-center gap-2">
            <TrendingUp className="text-primary h-6 w-6" />
            <CardTitle className="text-xl font-bold">Usage Over Time</CardTitle>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-row items-center gap-2">
          <TrendingUp className="text-primary h-6 w-6" />
          <CardTitle className="text-xl font-bold">Usage Over Time</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="font-sans">
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="quarter"
              tick={{ fill: colors.text, fontSize: 12 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              tickFormatter={formatQuarterTick}
              interval="equidistantPreserveStart"
            />
            <YAxis
              yAxisId="left"
              domain={[0, yAxisGamesMax]}
              allowDecimals={false}
              tick={{ fill: colors.text, fontSize: 12 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, yAxisPooledMax]}
              allowDecimals={false}
              tick={{ fill: colors.pooled, fontSize: 12 }}
              tickLine={{ stroke: colors.pooled }}
              axisLine={{ stroke: colors.pooled }}
              width={40}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                border: `1px solid ${colors.grid}`,
                borderRadius: '6px',
              }}
              labelStyle={{ color: colors.text }}
              labelFormatter={(value) => formatQuarterTick(value as string)}
              formatter={(value: number, name: string) => [
                value,
                name === 'gameCount' ? 'Games Played' : 'Tournaments Pooled',
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) =>
                value === 'gameCount' ? 'Games Played' : 'Tournaments Pooled'
              }
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="gameCount"
              fill={colors.games}
              fillOpacity={0.3}
              stroke={colors.games}
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="pooledCount"
              stroke={colors.pooled}
              strokeWidth={2}
              dot={{ fill: colors.pooled, strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

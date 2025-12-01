'use client';

import * as React from 'react';
import { format } from 'date-fns';
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

const QUARTER_START_MONTHS: Record<number, number> = {
  1: 0, // Q1 → January
  2: 3, // Q2 → April
  3: 6, // Q3 → July
  4: 9, // Q4 → October
};

const formatQuarterTick = (quarter: string): string => {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return quarter;

  const year = parseInt(match[1], 10);
  const quarterNum = parseInt(match[2], 10);
  const month = QUARTER_START_MONTHS[quarterNum];
  const date = new Date(year, month, 1);

  return format(date, 'MMM yyyy');
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
          <CardTitle>Usage Over Time</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Usage Over Time</CardTitle>
      </CardHeader>
      <CardContent className="font-sans">
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ComposedChart
            data={data}
            margin={{ top: 5, right: 50, bottom: 5, left: 0 }}
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
              tick={{ fill: colors.text, fontSize: 12 }}
              tickLine={{ stroke: colors.grid }}
              axisLine={{ stroke: colors.grid }}
              width={40}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, yAxisPooledMax]}
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

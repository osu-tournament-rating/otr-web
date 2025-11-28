'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { ChartContainer, ChartConfig } from '../ui/chart';
import type { BeatmapUsagePoint } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapUsageChartProps {
  data: BeatmapUsagePoint[];
  className?: string;
}

const getChartColors = (theme?: string) => ({
  line: '#3b82f6',
  grid:
    theme === 'dark' ? 'rgba(55, 65, 81, 0.4)' : 'rgba(156, 163, 175, 0.4)',
  text: theme === 'dark' ? '#d1d5db' : '#4b5563',
});

export default function BeatmapUsageChart({
  data,
  className,
}: BeatmapUsageChartProps) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  const chartConfig: ChartConfig = {
    gameCount: {
      label: 'Games',
      color: colors.line,
    },
  };

  const maxGames = Math.max(...data.map((d) => d.gameCount));
  const yAxisMax = Math.ceil(maxGames * 1.1);

  if (data.length < 2) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Usage Over Time</CardTitle>
          <CardDescription>Not enough data to display chart</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Usage Over Time</CardTitle>
        <CardDescription>
          Monthly games played in verified tournaments
        </CardDescription>
      </CardHeader>
      <CardContent className="font-sans">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="month"
                tick={{ fill: colors.text, fontSize: 12 }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                domain={[0, yAxisMax]}
                tick={{ fill: colors.text, fontSize: 12 }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
                width={40}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  border: `1px solid ${colors.grid}`,
                  borderRadius: '6px',
                }}
                labelStyle={{ color: colors.text }}
                formatter={(value: number) => [value, 'Games']}
              />
              <Line
                type="monotone"
                dataKey="gameCount"
                stroke={colors.line}
                strokeWidth={2}
                dot={{ fill: colors.line, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

'use client';

import { useTheme } from 'next-themes';
import {
  BarChart,
  Bar,
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
import type { BeatmapPlayerDistribution } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapPlayerDistributionChartProps {
  data: BeatmapPlayerDistribution[];
  className?: string;
}

const getChartColors = (theme?: string) => ({
  bar: '#8b5cf6',
  grid:
    theme === 'dark' ? 'rgba(55, 65, 81, 0.4)' : 'rgba(156, 163, 175, 0.4)',
  text: theme === 'dark' ? '#d1d5db' : '#4b5563',
});

export default function BeatmapPlayerDistributionChart({
  data,
  className,
}: BeatmapPlayerDistributionChartProps) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  const chartConfig: ChartConfig = {
    playerCount: {
      label: 'Players',
      color: colors.bar,
    },
  };

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Player Rating Distribution</CardTitle>
          <CardDescription>No player data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.playerCount)) : 1;
  const yAxisMax = Math.ceil(maxCount * 1.1);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Player Rating Distribution</CardTitle>
        <CardDescription>
          Rating distribution of players who have played this beatmap
        </CardDescription>
      </CardHeader>
      <CardContent className="font-sans">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="bucket"
                tick={{ fill: colors.text, fontSize: 10 }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
                angle={-45}
                textAnchor="end"
                height={60}
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
                formatter={(value: number) => [value, 'Players']}
                labelFormatter={(label) => `Rating: ${label}`}
              />
              <Bar dataKey="playerCount" fill={colors.bar} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

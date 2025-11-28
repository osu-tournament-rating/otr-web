'use client';

import { useMemo } from 'react';
import { useTheme } from 'next-themes';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { ChartContainer, ChartConfig } from '../ui/chart';
import { ModsEnumHelper } from '@/lib/enums';
import type { BeatmapModTrend } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapModTrendChartProps {
  data: BeatmapModTrend[];
  className?: string;
}

const MOD_COLORS: Record<string, string> = {
  NM: '#6b7280',
  HD: '#fbbf24',
  HR: '#ef4444',
  DT: '#3b82f6',
  FM: '#8b5cf6',
  Other: '#9ca3af',
};

const getChartColors = (theme?: string) => ({
  grid:
    theme === 'dark' ? 'rgba(55, 65, 81, 0.4)' : 'rgba(156, 163, 175, 0.4)',
  text: theme === 'dark' ? '#d1d5db' : '#4b5563',
});

function getModLabel(mods: number): string {
  if (mods === 0) return 'NM';
  const metadata = ModsEnumHelper.getMetadata(mods);
  const label = metadata
    .map((meta) => meta.text)
    .join('')
    .replace(/NF/g, '')
    .replace(/SO/g, '');
  if (label === '' || label === 'NM') return 'NM';
  if (label.includes('HD') && !label.includes('HR') && !label.includes('DT'))
    return 'HD';
  if (label.includes('HR') && !label.includes('HD') && !label.includes('DT'))
    return 'HR';
  if (label.includes('DT') && !label.includes('HD') && !label.includes('HR'))
    return 'DT';
  return 'Other';
}

export default function BeatmapModTrendChart({
  data,
  className,
}: BeatmapModTrendChartProps) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  const processedData = useMemo(() => {
    const monthMap = new Map<
      string,
      { NM: number; HD: number; HR: number; DT: number; Other: number }
    >();

    for (const item of data) {
      const modCategory = getModLabel(item.mods);
      if (!monthMap.has(item.month)) {
        monthMap.set(item.month, { NM: 0, HD: 0, HR: 0, DT: 0, Other: 0 });
      }
      const entry = monthMap.get(item.month)!;
      entry[modCategory as keyof typeof entry] += item.gameCount;
    }

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, mods]) => ({ month, ...mods }));
  }, [data]);

  const chartConfig: ChartConfig = {
    NM: { label: 'No Mod', color: MOD_COLORS.NM },
    HD: { label: 'Hidden', color: MOD_COLORS.HD },
    HR: { label: 'Hard Rock', color: MOD_COLORS.HR },
    DT: { label: 'Double Time', color: MOD_COLORS.DT },
    Other: { label: 'Other', color: MOD_COLORS.Other },
  };

  if (processedData.length < 2) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Mod Usage Over Time</CardTitle>
          <CardDescription>Not enough data to display chart</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const modKeys = ['NM', 'HD', 'HR', 'DT', 'Other'] as const;
  const hasData = modKeys.some((key) =>
    processedData.some((d) => d[key] > 0)
  );

  if (!hasData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Mod Usage Over Time</CardTitle>
          <CardDescription>No mod data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Mod Usage Over Time</CardTitle>
        <CardDescription>How mod usage has changed over time</CardDescription>
      </CardHeader>
      <CardContent className="font-sans">
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={processedData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="month"
                tick={{ fill: colors.text, fontSize: 12 }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
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
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {modKeys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={MOD_COLORS[key]}
                  fill={MOD_COLORS[key]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

'use client';

import { useMemo } from 'react';
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
import type { BeatmapScoreRatingPoint } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapAvgScoreByRatingChartProps {
  data: BeatmapScoreRatingPoint[];
  className?: string;
}

const RATING_BUCKET_SIZE = 200;

const getChartColors = (theme?: string) => ({
  grid:
    theme === 'dark' ? 'rgba(55, 65, 81, 0.4)' : 'rgba(156, 163, 175, 0.4)',
  text: theme === 'dark' ? '#d1d5db' : '#4b5563',
});

export default function BeatmapAvgScoreByRatingChart({
  data,
  className,
}: BeatmapAvgScoreByRatingChartProps) {
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  const processedData = useMemo(() => {
    if (data.length === 0) return [];

    const buckets = new Map<number, { totalScore: number; count: number }>();

    for (const point of data) {
      const bucketKey =
        Math.floor(point.playerRating / RATING_BUCKET_SIZE) * RATING_BUCKET_SIZE;

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { totalScore: 0, count: 0 });
      }

      const bucket = buckets.get(bucketKey)!;
      bucket.totalScore += point.score;
      bucket.count += 1;
    }

    return Array.from(buckets.entries())
      .map(([rating, { totalScore, count }]) => ({
        rating,
        ratingLabel: `${rating}`,
        avgScore: Math.round(totalScore / count),
        count,
      }))
      .sort((a, b) => a.rating - b.rating);
  }, [data]);

  const chartConfig: ChartConfig = {
    avgScore: { label: 'Avg Score', color: 'var(--mod-double-time)' },
  };

  if (processedData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Avg Score by Rating</CardTitle>
          <CardDescription>No score data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Avg Score by Rating</CardTitle>
        <CardDescription>
          Average score grouped by player rating ({RATING_BUCKET_SIZE} rating
          buckets)
        </CardDescription>
      </CardHeader>
      <CardContent className="font-sans">
        <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={processedData}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis
                dataKey="ratingLabel"
                tick={{ fill: colors.text, fontSize: 11 }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
              />
              <YAxis
                tick={{ fill: colors.text, fontSize: 11 }}
                tickLine={{ stroke: colors.grid }}
                axisLine={{ stroke: colors.grid }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                width={40}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                  border: `1px solid ${colors.grid}`,
                  borderRadius: '6px',
                }}
                formatter={(value: number) => [
                  value.toLocaleString(),
                  'Avg Score',
                ]}
                labelFormatter={(label) => `Rating: ${label}`}
              />
              <Bar dataKey="avgScore" fill="var(--mod-double-time)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

'use client';

import { ChartNoAxesCombined } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { BeatmapUsagePoint } from '@/lib/orpc/schema/beatmapStats';

interface BeatmapUsageChartProps {
  data: BeatmapUsagePoint[];
  className?: string;
}

const chartConfig = {
  pooledCount: {
    label: 'Pool records',
    color: 'var(--chart-2)',
  },
  gameCount: {
    label: 'Verified games',
    color: 'var(--chart-1)',
  },
} satisfies ChartConfig;

function formatQuarterTick(quarter: string): string {
  const match = quarter.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return quarter;

  return `Q${match[2]} '${match[1].slice(2)}`;
}

export default function BeatmapUsageChart({
  data,
  className,
}: BeatmapUsageChartProps) {
  const hasTrend = data.length >= 2;

  return (
    <Card
      data-testid="beatmap-usage-chart"
      className={`gap-0 overflow-hidden py-0 ${className ?? ''}`}
    >
      <CardHeader className="h-[49px] border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <ChartNoAxesCombined
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <CardTitle>Tournament activity</CardTitle>
        </div>
      </CardHeader>

      {!hasTrend ? (
        <CardContent className="flex h-[282px] items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Not enough history for a usage trend.
        </CardContent>
      ) : (
        <CardContent className="h-[282px] px-2 pt-4 pb-2 sm:px-4">
          <ChartContainer
            config={chartConfig}
            className="h-[250px] min-h-[250px] w-full"
          >
            <BarChart
              accessibilityLayer
              data={data}
              margin={{ top: 4, right: 4, bottom: 0, left: -16 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="quarter"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                minTickGap={18}
                tickFormatter={formatQuarterTick}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <ChartTooltip
                cursor={{ fill: 'var(--muted)' }}
                content={<ChartTooltipContent indicator="line" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                dataKey="pooledCount"
                fill="var(--color-pooledCount)"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
              <Bar
                dataKey="gameCount"
                fill="var(--color-gameCount)"
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      )}
    </Card>
  );
}

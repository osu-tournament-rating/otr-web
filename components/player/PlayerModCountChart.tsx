'use client';

import { ModsEnumHelper } from '@/lib/enums';
import { PlayerModStatsDTO } from '@osu-tournament-rating/otr-api-client';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
} from '../ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { PieChart, Pie, Cell, Label } from 'recharts';
import * as React from 'react';

export default function PlayerModCountChart({
  modStats,
}: {
  modStats: PlayerModStatsDTO[];
}) {
  // Process mod stats data
  interface ProcessedEntry {
    label: string;
    count: number;
  }

  // Define colors for the pie chart using the theme variables
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
    'hsl(var(--chart-6, 215 25% 27%))',
    'hsl(var(--chart-7, 142 72% 29%))',
    'hsl(var(--chart-8, 37 92% 50%))',
    'hsl(var(--chart-9, 0 84% 60%))',
    'hsl(var(--chart-10, 270 59% 66%))',
  ];
  const processedData = modStats.reduce<ProcessedEntry[]>((acc, value) => {
    const metadata = ModsEnumHelper.getMetadata(value.mods);
    // Join mod texts and remove all "NF" occurrences
    let label = metadata
      .map((meta) => meta.text)
      .join('')
      .replace(/NF/g, '');

    // If label is empty, it's "No Mod" (NM)
    if (label === '') {
      label = 'NM';
    }

    // Check if this label already exists in our accumulator
    const existingEntry = acc.find((item) => item.label === label);

    if (existingEntry) {
      // Update existing entry by adding counts
      existingEntry.count += value.count || 1;
    } else {
      // Add new entry
      acc.push({
        label,
        count: value.count || 1,
      });

      i++;
    }

    return acc;
  }, []);

  // Filter for entries with count >= 10 and sort by count (descending)
  const chartData = processedData
    .filter((entry) => entry.count >= 10)
    .sort((a, b) => b.count - a.count);

  // Build chart config dynamically from the data
  const chartConfig: ChartConfig = chartData.reduce((config, entry, index) => {
    config[entry.label] = {
      label: entry.label,
      color: COLORS[index % COLORS.length],
    };
    return config;
  }, {} as ChartConfig);

  // Calculate total games for percentage display and center label
  const totalGames = React.useMemo(() => {
    return chartData.reduce((sum, entry) => sum + entry.count, 0);
  }, [chartData]);

  // Custom tooltip content
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.count / totalGames) * 100).toFixed(1);

      return (
        <div className="rounded-md border bg-background p-2 shadow-md">
          <p className="font-medium">{data.label}</p>
          <p className="text-sm text-muted-foreground">
            {data.count} games ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };


  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle>Mod Distribution</CardTitle>
        <CardDescription>
          Games played with each mod combination
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="count"
              nameKey="label"
              label={({ label, percent }) =>
                `${label} (${(percent * 100).toFixed(0)}%)`
              }
              labelLine={false}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  name={entry.label}
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalGames.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Games
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
            </Pie>
            <ChartTooltip content={<CustomTooltip />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none text-muted-foreground">
          <p>Showing mods played in ten or more games.</p>
        </div>
      </CardFooter>
    </Card>
  );
}

'use client';

import { ModsEnumHelper } from '@/lib/enums';
import { PlayerModStatsDTO } from '@osu-tournament-rating/otr-api-client';
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
import { PieChart, Pie, Cell, Label } from 'recharts';
import * as React from 'react';

interface ProcessedEntry {
  label: string;
  count: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<PlayerModStatsDTO>;
  totalGames: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  totalGames,
}) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const percentage = ((data.count / totalGames) * 100).toFixed(1);
    const metadata = ModsEnumHelper.getMetadata(data.mods);

    return (
      <div className="rounded-md border bg-background p-2 shadow-md">
        <p className="font-medium">{metadata.map((m) => m.text).join()}</p>
        <p className="text-sm text-muted-foreground">
          {data.count} games ({percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

export default function PlayerModCountChart({
  modStats,
  className,
}: {
  modStats: PlayerModStatsDTO[];
  className?: string;
}) {
  // Process mod stats data
  const processedData = React.useMemo(() => {
    const data: ProcessedEntry[] = [];

    modStats.forEach((value) => {
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
      const existingEntryIndex = data.findIndex((item) => item.label === label);

      if (existingEntryIndex !== -1) {
        // Update existing entry by adding counts
        data[existingEntryIndex].count += value.count || 1;
      } else {
        // Add new entry
        data.push({
          label,
          count: value.count || 1,
        });
      }
    });

    // Filter for entries with count >= 10 and sort by count (descending)
    return data
      .filter((entry) => entry.count >= 10)
      .sort((a, b) => b.count - a.count);
  }, [modStats]);

  // Calculate total games for percentage display and center label
  const totalGames = React.useMemo(() => {
    return processedData.reduce((sum, entry) => sum + entry.count, 0);
  }, [processedData]);

  // Build chart config dynamically from the data
  const chartConfig: ChartConfig = React.useMemo(() => {
    return processedData.reduce((config, entry, index) => {
      config[entry.label] = {
        label: entry.label,
        color: `var(--chart-${(index % 10) + 1})`,
      };
      return config;
    }, {} as ChartConfig);
  }, [processedData]);

  const renderCenterLabel = React.useCallback(
    ({ viewBox }: any) => {
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
      return null;
    },
    [totalGames]
  );

  return (
    <Card className={className}>
      <CardHeader className="items-center">
        <CardTitle>Mod Distribution</CardTitle>
        <CardDescription>
          Games played with each mod combination
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0 font-sans">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] w-full pb-0 [&_.recharts-pie-label-text]:font-sans"
        >
          <PieChart>
            <Pie
              data={processedData}
              innerRadius="50%"
              outerRadius="70%"
              paddingAngle={3}
              dataKey="count"
              label={({ label, percent }) =>
                `${label} (${(percent * 100).toFixed(1)}%)`
              }
              labelLine={true}
            >
              {processedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`var(--chart-${(index % 10) + 1})`}
                  name={entry.label}
                />
              ))}
              <Label content={renderCenterLabel} />
            </Pie>
            <ChartTooltip
              content={<ChartTooltipContent className="font-sans" />}
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2 text-sm leading-none text-muted-foreground">
        <p>Showing mods played in ten or more games</p>
      </CardFooter>
    </Card>
  );
}

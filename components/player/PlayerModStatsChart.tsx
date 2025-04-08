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
import { Radar, RadarChart, PolarAngleAxis, PolarGrid } from 'recharts';

export default function PlayerModStatsChart({
  modStats,
}: {
  modStats: PlayerModStatsDTO[];
}) {
  // Process mod stats data
  interface ProcessedEntry {
    label: string;
    averageScore: number;
    count: number;
  }

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
      // Update existing entry with weighted average
      const totalCount = existingEntry.count + (value.count || 1);
      const weightedSum =
        existingEntry.averageScore * existingEntry.count +
        value.averageScore * (value.count || 1);

      existingEntry.averageScore = Math.round(weightedSum / totalCount);
      existingEntry.count = totalCount;
    } else {
      // Add new entry
      acc.push({
        label,
        averageScore: value.averageScore,
        count: value.count || 1,
      });
    }

    return acc;
  }, []);

  // Final chart data without count property, filtering for entries with count >= 5
  const chartData = processedData
    .filter((entry) => entry.count >= 5)
    .map(({ label, averageScore }) => ({
      label,
      averageScore,
    }));

  const chartConfig = {
    averageScore: {
      label: 'Score',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader className="items-center">
        <CardTitle>Mod Performance</CardTitle>
        <CardDescription>
          Average score across all games normalized to{' '}
          {Number(1_000_000).toLocaleString()}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={chartData} outerRadius="80%">
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="label" />
            <PolarGrid
              polarRadius={[200000, 400000, 600000, 800000, 1000000].map(
                (val) => (val / 1000000) * 90
              )}
            />
            <Radar
              name="Score"
              dataKey="averageScore"
              fill="var(--chart-1)"
              fillOpacity={0.25}
              stroke="var(--chart-1)"
              strokeWidth={3}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none text-muted-foreground">
          <p>Showing mods played in five or more games.</p>
        </div>
      </CardFooter>
    </Card>
  );
}

'use client';

import { Bar, BarChart, XAxis, YAxis } from 'recharts';

import { Eyebrow } from '@/components/beatmap/BeatmapSection';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatQuarterLong, summarizeActivity } from '@/lib/beatmaps/records';
import type { BeatmapUsagePoint } from '@/lib/orpc/schema/beatmapStats';
import { formatChartNumber } from '@/lib/utils/chart';

const chartConfig: ChartConfig = {
  gameCount: {
    label: 'Verified games',
    color: 'var(--chart-1)',
  },
};

/** `1 pool record`, `3 pool records`. */
function countLabel(count: number, noun: string) {
  return `${formatChartNumber(count)} ${noun}${count === 1 ? '' : 's'}`;
}

/** Verified games per quarter. */
export default function BeatmapUsageSparkline({
  usage,
}: {
  usage: BeatmapUsagePoint[];
}) {
  const activity = summarizeActivity(usage);

  // Pooled-but-never-played maps have nothing to draw.
  if (usage.length < 2 || activity.maxGames === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Eyebrow>Games per quarter</Eyebrow>
        <span className="text-xs text-muted-foreground">
          {`peak ${formatChartNumber(activity.maxGames)}`}
        </span>
      </div>
      <ChartContainer
        config={chartConfig}
        className="mt-2 aspect-auto h-20 w-full"
      >
        <BarChart
          data={usage}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          barCategoryGap={1}
          aria-label="Verified games per quarter"
        >
          <XAxis dataKey="quarter" hide />
          {/* Pinned to the peak; the default domain rounds up past it */}
          <YAxis domain={[0, activity.maxGames]} hide />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(label) => formatQuarterLong(String(label))}
                formatter={(_value, _name, item) => {
                  const point = (item as { payload?: BeatmapUsagePoint })
                    ?.payload;
                  if (!point) return null;
                  return (
                    <span className="font-medium text-foreground">
                      {countLabel(point.gameCount, 'verified game')},{' '}
                      {countLabel(point.pooledCount, 'pool record')}
                    </span>
                  );
                }}
              />
            }
          />
          <Bar
            dataKey="gameCount"
            fill="var(--color-gameCount)"
            fillOpacity={0.85}
            radius={[2, 2, 0, 0]}
            // A single game must still read; an empty quarter must stay empty.
            minPointSize={(value) => (value ? 2 : 0)}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
      <div className="mt-1 flex justify-between border-t pt-1 text-xs text-muted-foreground">
        <span>{formatQuarterLong(usage[0].quarter)}</span>
        <span>{formatQuarterLong(usage[usage.length - 1].quarter)}</span>
      </div>
    </div>
  );
}
